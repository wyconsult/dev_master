import React, { useState } from "react";
import "./App.css";
import FavoritesModule from "./components/FavoritesModule";

function App() {
  // Exemplo de dados de licitação (substitua pelos seus dados reais)
  const [licitacoes, setLicitacoes] = useState([
    {
      id: 17947652,
      objeto:
        "* Licitação Eletrônica * Banana da prata in natura * www.comprasnet.ba.gov.br *",
      orgao_site: "www.comprasnet.ba.gov.br",
      link_edital:
        "https://consultaonline.conlicitacao.com.br/boletim_web/public/api/download?auth=...",
    },
    {
      id: 17947593,
      objeto: "AQUISIÇÃO DE PRODUTOS DE ORIGEM ANIMAL E VEGETAL CONGELADOS",
      orgao_site: "https://egov.paradigmabs.com.br/sescba/Default.aspx",
      link_edital: "",
    },
  ]);

  return (
    <div className="App">
      <h1>Licitações - Módulo de Favoritos</h1>

      <div className="licitacoes-container">
        {licitacoes.map((licitacao) => (
          <div key={licitacao.id} className="licitacao-card">
            <h3>{licitacao.objeto}</h3>
            <p>
              Site:{" "}
              {licitacao.orgao_site || licitacao.link_edital || "Não informado"}
            </p>
            <FavoritesModule licitacao={licitacao} />
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
