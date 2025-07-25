import fetch from 'node-fetch';
import { logCurrentIP } from './ip-detector.js';

const CONLICITACAO_BASE_URL = 'https://consultaonline.conlicitacao.com.br/api';
const AUTH_TOKEN = '27a24a9a-44ce-4de8-a8ac-82cc58ca9f6e';

export class ConLicitacaoAPI {
  private async makeRequest<T>(endpoint: string): Promise<T> {
    const url = `${CONLICITACAO_BASE_URL}${endpoint}`;
    
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'X-AUTH-TOKEN': AUTH_TOKEN,
          'Content-Type': 'application/json',
          'User-Agent': 'LicitaTraker/1.0',
        },
      });

      const responseData = await response.json() as T;

      // Verifica se há erro de autenticação/IP
      if ((responseData as any)?.errors && Array.isArray((responseData as any).errors)) {
        const authError = (responseData as any).errors.find((err: any) => 
          err.error && err.error.includes('Token inválido ou IP de origem não cadastrado')
        );

        if (authError) {
          await logCurrentIP();
          throw new Error('IP_NOT_AUTHORIZED');
        }
      }

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      return responseData;
    } catch (error: any) {
      if (error.message === 'IP_NOT_AUTHORIZED') {
        throw error;
      }

      console.error(`ConLicitação API Error - ${endpoint}:`, error);
      throw new Error(`Erro de conexão com a API ConLicitação: ${error.message}`);
    }
  }

  async getFiltros() {
    return this.makeRequest<{ filtros: any[]; cliente: any }>('/filtros');
  }

  async getBoletins(filtroId: number, page: number = 1, perPage: number = 100, order: string = 'desc') {
    return this.makeRequest<{ boletins: any[]; filtro: any }>(
      `/filtro/${filtroId}/boletins?page=${page}&per_page=${perPage}&order=${order}`
    );
  }

  async getBoletimData(boletimId: number) {
    return this.makeRequest<{ boletim: any; licitacoes: any[]; acompanhamentos: any[] }>(
      `/boletim/${boletimId}`
    );
  }
}

export const conLicitacaoAPI = new ConLicitacaoAPI();
