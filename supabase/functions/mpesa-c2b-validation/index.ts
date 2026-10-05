// Supabase Edge Function: mpesa-c2b-validation
//
// PUBLIC endpoint — Safaricom calls this before accepting a C2B till
// payment, to ask "should this go through?". We accept everything; actual
// matching/handling happens in mpesa-c2b-confirmation once Safaricom has
// already completed the transaction. (Validation is only invoked if your
// Daraja app has validation enabled — many C2B setups skip it entirely.)

Deno.serve(async (_req) => {
  return new Response(JSON.stringify({ ResultCode: 0, ResultDesc: "Accepted" }), {
    headers: { "Content-Type": "application/json" },
  });
});
