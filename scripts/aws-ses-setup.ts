/**
 * Push the email templates to SES, and wire SNS for bounces.
 *
 *   npx tsx --conditions=react-server scripts/aws-ses-setup.ts          # dry run
 *   npx tsx --conditions=react-server scripts/aws-ses-setup.ts --write
 *
 * Idempotent: creates a template if absent, updates it if present. Run it after
 * every edit to `src/lib/email/templates.ts` — the repo is the source of truth
 * and SES is a cache of it.
 *
 * ## The two halves, and why SNS is only in one of them
 *
 * **Outbound** — the templates. SES renders them per recipient. SNS cannot do
 * this: it has no templating and no HTML.
 *
 * **Inbound** — bounce and complaint events. This is SNS's real job: SES
 * publishes to a topic, and something subscribed to that topic marks the
 * address as undeliverable. Continuing to mail an address that hard-bounced is
 * the fastest way to lose a sending reputation, and SES will suspend an account
 * over it.
 */
import {
  SESv2Client,
  CreateEmailTemplateCommand,
  UpdateEmailTemplateCommand,
  GetEmailTemplateCommand,
  CreateConfigurationSetCommand,
  CreateConfigurationSetEventDestinationCommand,
} from "@aws-sdk/client-sesv2";
import { SNSClient, CreateTopicCommand } from "@aws-sdk/client-sns";
import { templates } from "../src/lib/email/templates";
import { awsRegion } from "../src/lib/aws/env";

const WRITE = process.argv.includes("--write");
const ses = new SESv2Client({ region: awsRegion });
const sns = new SNSClient({ region: awsRegion });

const CONFIG_SET = "amantrika-default";

async function syncTemplates() {
  console.log(`\nTemplates (${templates.length})`);

  for (const t of templates) {
    let exists = true;
    try {
      await ses.send(new GetEmailTemplateCommand({ TemplateName: t.name }));
    } catch {
      exists = false;
    }

    console.log(`  ${exists ? "update" : "create"}  ${t.name}  — "${t.subject}"`);
    if (!WRITE) continue;

    const content = { Subject: t.subject, Html: t.html, Text: t.text };
    if (exists) {
      await ses.send(
        new UpdateEmailTemplateCommand({ TemplateName: t.name, TemplateContent: content })
      );
    } else {
      await ses.send(
        new CreateEmailTemplateCommand({ TemplateName: t.name, TemplateContent: content })
      );
    }
  }
}

async function wireBounces() {
  console.log("\nBounce and complaint handling (this is what SNS is for)");
  console.log(`  topic            amantrika-email-events`);
  console.log(`  config set       ${CONFIG_SET}`);
  console.log(`  events           BOUNCE, COMPLAINT, DELIVERY_DELAY, REJECT`);

  if (!WRITE) return;

  const topic = await sns.send(new CreateTopicCommand({ Name: "amantrika-email-events" }));
  const topicArn = topic.TopicArn!;

  // A configuration set is the handle SES hangs event destinations off. Sends
  // that do not name one emit no events at all — which is the usual reason
  // bounce handling appears to be configured and silently never fires.
  try {
    await ses.send(new CreateConfigurationSetCommand({ ConfigurationSetName: CONFIG_SET }));
  } catch (e) {
    if ((e as { name?: string }).name !== "AlreadyExistsException") throw e;
  }

  try {
    await ses.send(
      new CreateConfigurationSetEventDestinationCommand({
        ConfigurationSetName: CONFIG_SET,
        EventDestinationName: "sns-bounces",
        EventDestination: {
          Enabled: true,
          MatchingEventTypes: ["BOUNCE", "COMPLAINT", "DELIVERY_DELAY", "REJECT"],
          SnsDestination: { TopicArn: topicArn },
        },
      })
    );
  } catch (e) {
    if ((e as { name?: string }).name !== "AlreadyExistsException") throw e;
  }

  console.log(`  topic ARN        ${topicArn}`);
  console.log(
    "\n  NOT DONE YET: nothing is subscribed to that topic, so bounces are\n" +
      "  recorded by AWS and acted on by nobody. Subscribing a handler that marks\n" +
      "  an address undeliverable is the remaining work."
  );
}

async function main() {
  console.log(WRITE ? "WRITING to SES/SNS" : "DRY RUN — pass --write to commit");
  await syncTemplates();
  await wireBounces();
  console.log(WRITE ? "\nDone.\n" : "\nNothing was written.\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
