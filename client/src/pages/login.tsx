import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginRequest } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Gavel, LogIn } from "lucide-react";
import { useLocation } from "wouter";

export default function Login() {
  const { login } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const form = useForm<LoginRequest>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (data: LoginRequest) => {
      const response = await apiRequest("POST", "/api/auth/login", data);
      return response.json();
    },
    onSuccess: (data) => {
      login(data.user);
      setLocation("/biddings");
      toast({
        title: "Sucesso",
        description: "Login realizado com sucesso!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message || "Credenciais inválidas",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: LoginRequest) => {
    loginMutation.mutate(data);
  };

  const handleSignup = () => {
    setLocation("/register");
  };

  const handleForgotPassword = () => {
    setLocation("/forgot-password");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 px-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto w-20 h-20 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center mb-6 shadow-lg">
            <Gavel className="text-white h-10 w-10" />
          </div>
          <h2 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-blue-700 bg-clip-text text-transparent mb-3">LicitaTraker</h2>
          <p className="text-xl text-gray-600 mb-2">Bem-vindo de volta! 👋</p>
          <p className="text-gray-500">Acesse sua conta para continuar</p>
        </div>
        
        <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
          <CardContent className="pt-8 pb-8 px-8">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>E-mail</FormLabel>
                      <FormControl>
                        <Input 
                          type="email" 
                          placeholder="seu@email.com" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Senha</FormLabel>
                      <FormControl>
                        <Input 
                          type="password" 
                          placeholder="Sua senha" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button 
                  type="submit" 
                  className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5"
                  disabled={loginMutation.isPending}
                >
                  <LogIn className="mr-2 h-5 w-5" />
                  {loginMutation.isPending ? "Entrando..." : "Entrar"}
                </Button>

                <div className="flex items-center justify-between text-sm pt-2">
                  <Button 
                    type="button" 
                    variant="link"
                    onClick={handleSignup}
                    className="p-0 h-auto text-blue-600 hover:text-blue-800 font-medium transition-colors duration-200"
                  >
                    Cadastrar-se
                  </Button>
                  <Button 
                    type="button" 
                    variant="link"
                    onClick={handleForgotPassword}
                    className="p-0 h-auto text-blue-600 hover:text-blue-800 font-medium transition-colors duration-200"
                  >
                    Esqueceu a senha?
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
        
        <div className="text-center text-sm text-gray-600">
          <p>Usuário de teste: admin@test.com</p>
          <p>Senha: admin123</p>
        </div>
      </div>
    </div>
  );
}
