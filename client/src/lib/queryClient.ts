import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    let url = queryKey[0] as string;
    
    // Handle query parameters from queryKey
    if (queryKey.length > 1 && queryKey[1]) {
      const params = queryKey[1] as Record<string, string>;
      const searchParams = new URLSearchParams();
      
      Object.entries(params).forEach(([key, value]) => {
        if (value && value !== "all" && value !== "") {
          searchParams.append(key, value);
        }
      });
      
      if (searchParams.toString()) {
        url += `?${searchParams.toString()}`;
      }
    }

    // Configuração otimizada para API lenta
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout
    
    const res = await fetch(url, {
      credentials: "include",
      signal: controller.signal,
      headers: {
        'Connection': 'keep-alive',
        'Cache-Control': 'no-cache',
      },
    });
    
    clearTimeout(timeoutId);

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      retry: (failureCount, error: any) => {
        // Não tentar novamente em erros 401/403/404
        if (error?.message?.includes('401') || 
            error?.message?.includes('403') || 
            error?.message?.includes('404')) {
          return false;
        }
        // Tentar até 2 vezes para outros erros (timeouts, 502, etc)
        return failureCount < 2;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000), // Exponential backoff
      staleTime: 2 * 60 * 1000, // Considerar dados válidos por 2 minutos
      gcTime: 5 * 60 * 1000, // Manter cache por 5 minutos
      refetchInterval: false,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: false,
    },
  },
});
