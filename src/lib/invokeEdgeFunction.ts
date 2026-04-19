import { FunctionsFetchError } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type InvokeResult = Awaited<ReturnType<typeof supabase.functions.invoke>>;

/**
 * Invoca uma Edge Function e re-tenta só em falha de rede (FunctionsFetchError),
 * comuns em Wi‑Fi instável ou picos no gateway — não altera erros HTTP (4xx/5xx) nem corpo JSON.
 */
export async function invokeEdgeFunction(
  name: string,
  options: Parameters<typeof supabase.functions.invoke>[1]
): Promise<InvokeResult> {
  const maxAttempts = 3;
  let last: InvokeResult | null = null;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    last = await supabase.functions.invoke(name, options);
    if (!last.error) return last;
    if (!(last.error instanceof FunctionsFetchError)) return last;
    if (attempt < maxAttempts - 1) {
      await new Promise((r) => setTimeout(r, 400 * 2 ** attempt));
    }
  }

  return last!;
}
