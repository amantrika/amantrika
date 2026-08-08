import "server-only";
import { DodoPaymentProvider } from "@/lib/payments/dodo";
import { MockPaymentProvider } from "@/lib/payments/mock";
import type { PaymentProvider, PaymentProviderName } from "@/lib/payments/provider";

export * from "@/lib/payments/provider";

let instance: PaymentProvider | null = null;

export function paymentProviderName(): PaymentProviderName {
  return process.env.PAYMENT_PROVIDER === "dodo" ? "dodo" : "mock";
}

/**
 * The single entry point. Business logic never names a concrete provider, so
 * the only thing that changes when real money starts moving is one env var.
 */
export function getPaymentProvider(): PaymentProvider {
  if (!instance || instance.name !== paymentProviderName()) {
    instance = paymentProviderName() === "dodo" ? new DodoPaymentProvider() : new MockPaymentProvider();
  }
  return instance;
}
