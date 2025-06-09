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
    toast({
      title: "Funcionalidade não implementada",
      description: "A funcionalidade de cadastro será implementada em breve.",
    });
  };

  const handleForgotPassword = () => {
    toast({
      title: "Funcionalidade não implementada",
      description: "A funcionalidade de recuperação de senha será implementada em breve.",
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-primary rounded-full flex items-center justify-center mb-6">
            <Gavel className="text-white h-8 w-8" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Sistema de Licitações</h2>
          <p className="text-gray-600">Acesse sua conta para continuar</p>
        </div>
        
        <Card>
          <CardContent className="pt-6">
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
                  className="w-full"
                  disabled={loginMutation.isPending}
                >
                  <LogIn className="mr-2 h-4 w-4" />
                  {loginMutation.isPending ? "Entrando..." : "Entrar"}
                </Button>

                <div className="flex items-center justify-between text-sm">
                  <Button 
                    type="button" 
                    variant="link"
                    onClick={handleSignup}
                    className="p-0 h-auto text-primary hover:text-blue-700"
                  >
                    Cadastrar-se
                  </Button>
                  <Button 
                    type="button" 
                    variant="link"
                    onClick={handleForgotPassword}
                    className="p-0 h-auto text-primary hover:text-blue-700"
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
