import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { Gavel, UserPlus, ArrowLeft } from "lucide-react";
import { Link } from "wouter";

const registerSchema = z.object({
  companyName: z.string().min(1, "Nome da empresa é obrigatório"),
  cnpj: z.string().min(14, "CNPJ deve ter 14 dígitos").regex(/^\d{14}$/, "CNPJ deve conter apenas números"),
  name: z.string().min(1, "Nome é obrigatório"),
  email: z.string().email("E-mail inválido"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
});

type RegisterRequest = z.infer<typeof registerSchema>;

export default function Register() {
  const { toast } = useToast();

  const form = useForm<RegisterRequest>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      companyName: "",
      cnpj: "",
      name: "",
      email: "",
      password: "",
    },
  });

  const onSubmit = (data: RegisterRequest) => {
    toast({
      title: "Funcionalidade em desenvolvimento",
      description: "O cadastro será implementado quando a API estiver disponível.",
    });
    console.log("Register data:", data);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-blue-50 px-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto w-20 h-20 rounded-full bg-gradient-to-r from-green-500 to-emerald-600 flex items-center justify-center mb-6 shadow-lg">
            <UserPlus className="text-white h-10 w-10" />
          </div>
          <h2 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-green-700 bg-clip-text text-transparent mb-3">LicitaTraker</h2>
          <p className="text-xl text-gray-600 mb-2">Junte-se a nós! 🚀</p>
          <p className="text-gray-500">Crie sua conta para começar</p>
        </div>
        
        <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
          <CardContent className="pt-8 pb-8 px-8">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="companyName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome da Empresa</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Sua empresa" 
                          className="border-gray-300 text-black placeholder:text-gray-400"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="cnpj"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CNPJ</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="00000000000000" 
                          maxLength={14}
                          className="border-gray-300 text-black placeholder:text-gray-400"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Seu nome completo" 
                          className="border-gray-300 text-black placeholder:text-gray-400"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

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
                          className="border-gray-300 text-black placeholder:text-gray-400"
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
                          className="border-gray-300 text-black placeholder:text-gray-400"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button 
                  type="submit" 
                  className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5"
                >
                  <UserPlus className="mr-2 h-5 w-5" />
                  Cadastrar
                </Button>

                <div className="text-center pt-2">
                  <Link href="/">
                    <Button 
                      type="button" 
                      variant="link"
                      className="text-green-600 hover:text-green-800 font-medium transition-colors duration-200"
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Voltar ao login
                    </Button>
                  </Link>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}