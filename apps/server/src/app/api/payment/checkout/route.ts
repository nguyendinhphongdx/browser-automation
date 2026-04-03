import { getUserFromRequest } from "@/lib/jwt";
import { prisma } from "@/lib/db";

// POST: Tạo checkout session (Stripe placeholder)
export async function POST(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { scriptId } = await request.json();
  if (!scriptId) {
    return Response.json({ error: "scriptId là bắt buộc" }, { status: 400 });
  }

  const script = await prisma.script.findUnique({
    where: { id: scriptId },
    include: { author: { select: { id: true, name: true } } },
  });

  if (!script) {
    return Response.json({ error: "Script không tồn tại" }, { status: 404 });
  }

  if (script.price === 0) {
    return Response.json({ error: "Script miễn phí, không cần thanh toán" }, { status: 400 });
  }

  // TODO: Tích hợp Stripe Checkout Session
  // const session = await stripe.checkout.sessions.create({
  //   mode: 'payment',
  //   line_items: [{ price_data: { currency: 'usd', unit_amount: script.price, product_data: { name: script.name } }, quantity: 1 }],
  //   payment_intent_data: { application_fee_amount: Math.round(script.price * 0.3), transfer_data: { destination: authorStripeAccountId } },
  //   success_url: `${process.env.NEXT_PUBLIC_URL}/marketplace/${script.slug}?purchased=true`,
  //   cancel_url: `${process.env.NEXT_PUBLIC_URL}/marketplace/${script.slug}`,
  // })

  return Response.json({
    message: "Stripe chưa được cấu hình. Thêm STRIPE_SECRET_KEY vào .env để kích hoạt thanh toán.",
    script: { id: script.id, name: script.name, price: script.price },
    // url: session.url,
  });
}
