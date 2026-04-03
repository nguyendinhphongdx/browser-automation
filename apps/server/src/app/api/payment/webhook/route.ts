// POST: Stripe Webhook handler
export async function POST(request: Request) {
  // TODO: Xác minh Stripe webhook signature
  // const sig = request.headers.get('stripe-signature')
  // const event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET)

  const body = await request.text();

  // Placeholder — sẽ implement khi có Stripe key
  // switch (event.type) {
  //   case 'checkout.session.completed':
  //     // Cấp quyền download cho user
  //     break
  //   case 'account.updated':
  //     // Cập nhật trạng thái Stripe Connect account
  //     break
  // }

  return Response.json({ received: true });
}
