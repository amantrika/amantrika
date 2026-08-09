import "server-only";
import { GetCommand, PutCommand, QueryCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { ddb } from "@/lib/aws/dynamo";
import { tableName } from "@/lib/aws/env";
import { META_SK, SK_PREFIX, eventPk, orderSk, paymentPk } from "@/lib/aws/keys";

/**
 * Orders and the payment ledger.
 *
 * `CLAUDE.md` §2.3 is the whole design brief for this file: payment truth is
 * the webhook, the browser callback grants nothing, and processing is
 * idempotent by provider payment id. Everything here exists to keep those three
 * true without a database transaction to lean on.
 *
 * ## Why idempotency is a conditional write, not a lookup
 *
 * The obvious shape is "have we seen this payment id? no → process it". That
 * has a race: two webhook deliveries arriving together both read "no" and both
 * mark the invitation paid, and a retrying provider *will* deliver twice.
 *
 * `claimPaymentEvent` instead writes a marker item with
 * `attribute_not_exists(PK)`. Exactly one caller wins, whatever the timing, and
 * the loser is told to stop. That is the same trick `createInvite` uses, and it
 * is the only concurrency primitive DynamoDB gives us without transactions.
 */

export type OrderStatus = "pending" | "paid" | "failed" | "refunded";

export interface OrderItem {
  PK: string;
  SK: string;
  _type: "order";
  id: string;
  eventId: string;
  buyerId: string;
  agentId?: string;
  planCode: string;
  amountInr: number;
  currency: string;
  provider: string;
  status: OrderStatus;
  providerSessionId?: string;
  providerPaymentId?: string;
  providerRef?: string;
  failureReason?: string;
  paidAt?: string;
  createdAt: string;
  updatedAt: string;
}

export async function createOrder(input: {
  eventId: string;
  buyerId: string;
  agentId?: string;
  planCode: string;
  amountInr: number;
  provider: string;
  providerSessionId?: string;
}): Promise<OrderItem> {
  const now = new Date().toISOString();
  const id = crypto.randomUUID();

  const item: OrderItem = {
    PK: eventPk(input.eventId),
    SK: orderSk(id),
    _type: "order",
    id,
    eventId: input.eventId,
    buyerId: input.buyerId,
    agentId: input.agentId,
    planCode: input.planCode,
    amountInr: input.amountInr,
    currency: "INR",
    provider: input.provider,
    status: "pending",
    providerSessionId: input.providerSessionId,
    createdAt: now,
    updatedAt: now,
  };

  await ddb.send(
    new PutCommand({
      TableName: tableName,
      Item: item,
      ConditionExpression: "attribute_not_exists(PK)",
    })
  );
  return item;
}

export async function listOrders(eventId: string): Promise<OrderItem[]> {
  const res = await ddb.send(
    new QueryCommand({
      TableName: tableName,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
      ExpressionAttributeValues: { ":pk": eventPk(eventId), ":sk": SK_PREFIX.order },
    })
  );
  return (res.Items ?? []) as OrderItem[];
}

export async function getOrder(eventId: string, orderId: string): Promise<OrderItem | null> {
  const res = await ddb.send(
    new GetCommand({ TableName: tableName, Key: { PK: eventPk(eventId), SK: orderSk(orderId) } })
  );
  return (res.Item as OrderItem) ?? null;
}

/**
 * Claim a webhook delivery for processing.
 *
 * Returns false when this provider event has already been claimed — the caller
 * must then do nothing and return 200, because a provider that receives an
 * error will redeliver, and redelivering something already processed is exactly
 * what we are preventing.
 *
 * The payload is stored for forensics. When a payment goes wrong the question
 * is always "what did they actually send us", and by then the provider's
 * dashboard has usually moved on.
 */
export async function claimPaymentEvent(input: {
  providerPaymentId: string;
  providerEventId: string;
  provider: string;
  eventType: string;
  payload: unknown;
  orderId?: string;
}): Promise<boolean> {
  try {
    await ddb.send(
      new PutCommand({
        TableName: tableName,
        Item: {
          PK: paymentPk(input.providerPaymentId),
          SK: `EVENT#${input.providerEventId}`,
          _type: "paymentEvent",
          provider: input.provider,
          eventType: input.eventType,
          orderId: input.orderId,
          payload: input.payload,
          receivedAt: new Date().toISOString(),
        },
        ConditionExpression: "attribute_not_exists(PK)",
      })
    );
    return true;
  } catch (error) {
    if ((error as { name?: string }).name === "ConditionalCheckFailedException") return false;
    throw error;
  }
}

/**
 * Mark an order paid.
 *
 * Conditional on the order still being `pending`, so a late duplicate cannot
 * rewrite `paidAt` and make the ledger disagree with itself. Returns false if
 * it was already paid — which is success from the webhook's point of view, not
 * an error.
 */
export async function markOrderPaid(
  eventId: string,
  orderId: string,
  input: { providerPaymentId: string; providerRef?: string }
): Promise<boolean> {
  const now = new Date().toISOString();
  try {
    await ddb.send(
      new UpdateCommand({
        TableName: tableName,
        Key: { PK: eventPk(eventId), SK: orderSk(orderId) },
        UpdateExpression:
          "SET #status = :paid, paidAt = :now, updatedAt = :now, providerPaymentId = :pid, providerRef = :ref",
        ConditionExpression: "#status = :pending",
        ExpressionAttributeNames: { "#status": "status" },
        ExpressionAttributeValues: {
          ":paid": "paid",
          ":pending": "pending",
          ":now": now,
          ":pid": input.providerPaymentId,
          ":ref": input.providerRef ?? null,
        },
      })
    );
    return true;
  } catch (error) {
    if ((error as { name?: string }).name === "ConditionalCheckFailedException") return false;
    throw error;
  }
}

export async function markOrderFailed(
  eventId: string,
  orderId: string,
  reason: string
): Promise<void> {
  await ddb.send(
    new UpdateCommand({
      TableName: tableName,
      Key: { PK: eventPk(eventId), SK: orderSk(orderId) },
      UpdateExpression: "SET #status = :failed, failureReason = :reason, updatedAt = :now",
      ConditionExpression: "#status = :pending",
      ExpressionAttributeNames: { "#status": "status" },
      ExpressionAttributeValues: {
        ":failed": "failed",
        ":pending": "pending",
        ":reason": reason.slice(0, 500),
        ":now": new Date().toISOString(),
      },
    })
  ).catch((error) => {
    // Already resolved one way or the other. Not worth failing a webhook over.
    if ((error as { name?: string }).name !== "ConditionalCheckFailedException") throw error;
  });
}

/**
 * Grant the paid entitlement: publish the invitation and record its plan.
 *
 * Deliberately not conditional on ownership. This runs from the webhook, where
 * there is no user — the provider is the actor, and the order has already
 * proved which invitation was bought. An ownership check here would fail every
 * real payment.
 */
export async function grantPaidPlan(eventId: string, planCode: string): Promise<void> {
  const now = new Date().toISOString();
  await ddb.send(
    new UpdateCommand({
      TableName: tableName,
      Key: { PK: eventPk(eventId), SK: META_SK },
      UpdateExpression:
        "SET planCode = :plan, #status = :paid, publishedAt = if_not_exists(publishedAt, :now), updatedAt = :now",
      ExpressionAttributeNames: { "#status": "status" },
      ExpressionAttributeValues: { ":plan": planCode, ":paid": "paid", ":now": now },
    })
  );
}
