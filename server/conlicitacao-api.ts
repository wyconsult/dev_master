import fetch from 'node-fetch';

const CONLICITACAO_BASE_URL = 'https://consultaonline.conlicitacao.com.br/api';
const AUTH_TOKEN = '27a24a9a-44ce-4de8-a8ac-82cc58ca9f6e';

export class ConLicitacaoAPI {
  private async makeRequest(endpoint: string): Promise<any> {
    const url = `${CONLICITACAO_BASE_URL}${endpoint}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-AUTH-TOKEN': AUTH_TOKEN,
        'Content-Type': 'application/json',
        'User-Agent': 'LicitaTraker/1.0',
      },
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    return response.json();
  }

  async getFiltros() {
    return this.makeRequest('/filtros');
  }

  async getBoletins(filtroId: number, page: number = 1, perPage: number = 100, order: string = 'desc') {
    return this.makeRequest(`/filtro/${filtroId}/boletins?page=${page}&per_page=${perPage}&order=${order}`);
  }

  async getBoletimData(boletimId: number) {
    return this.makeRequest(`/boletim/${boletimId}`);
  }
}

export const conLicitacaoAPI = new ConLicitacaoAPI();