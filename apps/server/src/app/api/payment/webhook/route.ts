import Stripe from "stripe";

// POST: Stripe Webhook handler
export async function POST(request: Request) {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  // Fail closed: without both a Stripe secret key and a webhook signing
  // secret we cannot verify the request actually came from Stripe, so we
  // must not process it (this is what the original placeholder got wrong —
  // it accepted every POST with no verification at all).
  if (!secretKey || !webhookSecret) {
    return Response.json(
      { error: "Stripe chưa được cấu hình (thiếu STRIPE_SECRET_KEY hoặc STRIPE_WEBHOOK_SECRET)" },
      { status: 501 }
    );
  }

  const sig = request.headers.get("stripe-signature");
  if (!sig) {
    return Response.json({ error: "Thiếu header stripe-signature" }, { status: 400 });
  }

  const body = await request.text();

  const stripe = new Stripe(secretKey);

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Signature verification failed";
    return Response.json({ error: `Webhook signature không hợp lệ: ${message}` }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed":
      // TODO: Cấp quyền download cho user
      break;
    case "account.updated":
      // TODO: Cập nhật trạng thái Stripe Connect account
      break;
    default:
      break;
  }

  return Response.json({ received: true });
}
