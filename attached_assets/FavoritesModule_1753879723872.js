import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import "./FavoritesModule.css";

// Dados mockados (substitua pelos seus imports reais)
const Tab_Alimentacao = [
  { Id: 1, Tipo_Objeto: "Alimentação", Objeto: "Auxiliar de Cozinha" },
  { Id: 2, Tipo_Objeto: "Alimentação", Objeto: "Coffe Break/Almoço/Jantar" },
  { Id: 6, Tipo_Objeto: "Alimentação", Objeto: "Fornecimento de Alimentação" },
  { Id: 26, Tipo_Objeto: "Alimentação", Objeto: "Nutrição Hospitalar" },
];

const Tab_Limpeza = [
  { Id: 1, Tipo_Objeto: "Mão de Obra", Objeto: "Apoio adm e copeiragem" },
];

const Site = [
  { Id: 13, Tipo: "Internet", Site: "https://www.comprasnet.ba.gov.br/" },
  {
    Id: 36,
    Tipo: "Internet",
    Site: "https://egov.paradigmabs.com.br/sescba/Default.aspx",
  },
  {
    Id: 37,
    Tipo: "Internet",
    Site: "https://egov.paradigmabs.com.br/eseba/Default.aspx",
  },
];

const FavoritesModule = ({ licitacao, onUpdate }) => {
  // Garante valores padrão para licitação
  const safeLicitacao = {
    id: "",
    objeto: "",
    orgao_site: "",
    link_edital: "",
    ...licitacao,
  };

  // Função segura para comparação de URLs
  const compareUrls = (url1, url2) => {
    if (!url1 || !url2) return false;

    const normalize = (url) => {
      return url
        .toString()
        .replace(/^(https?:\/\/)?(www\.)?/, "")
        .replace(/\/+$/, "")
        .toLowerCase();
    };

    const cleanUrl1 = normalize(url1);
    const cleanUrl2 = normalize(url2);

    return cleanUrl1.includes(cleanUrl2) || cleanUrl2.includes(cleanUrl1);
  };

  // Estados do componente
  const [showOptions, setShowOptions] = useState(false);
  const [selectedTipoObjeto, setSelectedTipoObjeto] = useState("");
  const [selectedSite, setSelectedSite] = useState("");
  const [filteredTipoObjeto, setFilteredTipoObjeto] = useState([]);
  const [filteredSites, setFilteredSites] = useState([]);
  const [searchTipoObjeto, setSearchTipoObjeto] = useState("");
  const [searchSite, setSearchSite] = useState("");
  const [newTipoObjeto, setNewTipoObjeto] = useState("");
  const [newSite, setNewSite] = useState("");
  const [showNewTipoObjeto, setShowNewTipoObjeto] = useState(false);
  const [showNewSite, setShowNewSite] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showFicha, setShowFicha] = useState(false);
  const [currentFavorite, setCurrentFavorite] = useState(null);

  // Carrega favoritos ao iniciar
  useEffect(() => {
    const savedFavorites = JSON.parse(localStorage.getItem("favorites")) || [];
    const fav = savedFavorites.find((fav) => fav.id === safeLicitacao.id);
    if (fav) {
      setIsFavorite(true);
      setCurrentFavorite(fav);
    }
  }, [safeLicitacao.id]);

  // Filtra tipos de objeto
  useEffect(() => {
    const allTipoObjeto = [...Tab_Alimentacao, ...Tab_Limpeza];

    let filtered = allTipoObjeto;

    if (safeLicitacao.objeto && safeLicitacao.objeto.trim() !== "") {
      filtered = allTipoObjeto.filter(
        (item) =>
          item.Objeto.toLowerCase().includes(
            safeLicitacao.objeto.toLowerCase()
          ) ||
          safeLicitacao.objeto.toLowerCase().includes(item.Objeto.toLowerCase())
      );
    }

    if (searchTipoObjeto && searchTipoObjeto.trim() !== "") {
      filtered = allTipoObjeto.filter(
        (item) =>
          item.Objeto.toLowerCase().includes(searchTipoObjeto.toLowerCase()) ||
          item.Tipo_Objeto.toLowerCase().includes(
            searchTipoObjeto.toLowerCase()
          )
      );
    }

    setFilteredTipoObjeto(filtered);
  }, [safeLicitacao.objeto, searchTipoObjeto]);

  // Filtra sites
  useEffect(() => {
    const siteFilter =
      safeLicitacao.orgao_site || safeLicitacao.link_edital || "";

    let filtered = Site;

    if (siteFilter.trim() !== "") {
      filtered = Site.filter((item) => {
        if (!item?.Site) return false;
        return (
          compareUrls(item.Site, siteFilter) ||
          compareUrls(siteFilter, item.Site)
        );
      });
    }

    if (searchSite && searchSite.trim() !== "") {
      filtered = Site.filter((item) => {
        if (!item?.Site) return false;
        return (
          compareUrls(item.Site, searchSite) ||
          item.Tipo?.toLowerCase().includes(searchSite.toLowerCase())
        );
      });
    }

    setFilteredSites(filtered);
  }, [safeLicitacao.orgao_site, safeLicitacao.link_edital, searchSite]);

  // Função para favoritar/desfavoritar
  const handleFavorite = () => {
    if (isFavorite) {
      removeFavorite();
    } else {
      setShowOptions(true);
      setSelectedTipoObjeto("");
      setSelectedSite("");
      setSearchTipoObjeto("");
      setSearchSite("");
      setShowNewTipoObjeto(false);
      setShowNewSite(false);
    }
  };

  // Função para salvar favorito
  const saveFavorite = () => {
    const tipoObjetoToSave = showNewTipoObjeto
      ? { Tipo_Objeto: "Novo Tipo", Objeto: newTipoObjeto }
      : filteredTipoObjeto.find((item) => item.Objeto === selectedTipoObjeto);

    const siteToSave = showNewSite
      ? { Tipo: "Novo Site", Site: newSite }
      : filteredSites.find((item) => item.Site === selectedSite);

    const favoriteData = {
      id: safeLicitacao.id,
      tipoObjeto: tipoObjetoToSave?.Tipo_Objeto || "Não categorizado",
      objeto: tipoObjetoToSave?.Objeto || safeLicitacao.objeto,
      site:
        siteToSave?.Site ||
        safeLicitacao.orgao_site ||
        safeLicitacao.link_edital ||
        "Não especificado",
      siteType: siteToSave?.Tipo || "Não categorizado",
      licitacaoData: safeLicitacao,
      timestamp: new Date().toISOString(),
    };

    const savedFavorites = JSON.parse(localStorage.getItem("favorites")) || [];
    const updatedFavorites = isFavorite
      ? savedFavorites.map((fav) =>
          fav.id === safeLicitacao.id ? favoriteData : fav
        )
      : [...savedFavorites, favoriteData];

    localStorage.setItem("favorites", JSON.stringify(updatedFavorites));
    setIsFavorite(true);
    setCurrentFavorite(favoriteData);
    setShowConfirmation(true);
    setShowOptions(false);
    setShowFicha(true);

    // Reset form
    setSelectedTipoObjeto("");
    setSelectedSite("");
    setSearchTipoObjeto("");
    setSearchSite("");
    setNewTipoObjeto("");
    setNewSite("");
    setShowNewTipoObjeto(false);
    setShowNewSite(false);

    if (onUpdate) onUpdate();
    setTimeout(() => setShowConfirmation(false), 3000);
  };

  // Função para remover favorito
  const removeFavorite = () => {
    const updatedFavorites = JSON.parse(
      localStorage.getItem("favorites") || "[]"
    ).filter((fav) => fav.id !== safeLicitacao.id);
    localStorage.setItem("favorites", JSON.stringify(updatedFavorites));
    setIsFavorite(false);
    setCurrentFavorite(null);
    setShowFicha(false);
    if (onUpdate) onUpdate();
  };

  // Função para renderizar opções de tipo de objeto
  const renderTipoObjetoOptions = () => {
    if (showNewTipoObjeto) {
      return (
        <div className="new-option-container">
          <input
            type="text"
            value={newTipoObjeto}
            onChange={(e) => setNewTipoObjeto(e.target.value)}
            placeholder="Digite o novo tipo de objeto"
            className="new-input"
          />
          <div className="new-option-buttons">
            <button
              className="cancel-button"
              onClick={() => setShowNewTipoObjeto(false)}
            >
              Cancelar
            </button>
            <button
              className="save-new-button"
              onClick={() => newTipoObjeto.trim() && saveFavorite()}
              disabled={!newTipoObjeto.trim()}
            >
              Salvar
            </button>
          </div>
        </div>
      );
    }

    return (
      <>
        <div className="search-box">
          <input
            type="text"
            value={searchTipoObjeto}
            onChange={(e) => {
              setSearchTipoObjeto(e.target.value);
              setSelectedTipoObjeto("");
            }}
            placeholder="Buscar tipo de objeto..."
            className="search-input"
          />
        </div>

        <div className="select-container">
          {filteredTipoObjeto.length > 0 ? (
            <select
              value={selectedTipoObjeto}
              onChange={(e) => setSelectedTipoObjeto(e.target.value)}
              size={Math.min(filteredTipoObjeto.length, 5)}
              className="tipo-objeto-select"
            >
              {filteredTipoObjeto.map((item, index) => (
                <option key={index} value={item.Objeto}>
                  {item.Objeto} ({item.Tipo_Objeto})
                </option>
              ))}
            </select>
          ) : (
            <div className="no-results">Nenhum resultado encontrado</div>
          )}
        </div>

        <button
          className="add-new-button"
          onClick={() => {
            setShowNewTipoObjeto(true);
            setSelectedTipoObjeto("");
          }}
        >
          + Adicionar Novo Tipo
        </button>
      </>
    );
  };

  // Função para renderizar opções de site
  const renderSiteOptions = () => {
    if (showNewSite) {
      return (
        <div className="new-option-container">
          <input
            type="text"
            value={newSite}
            onChange={(e) => setNewSite(e.target.value)}
            placeholder="Digite o novo site"
            className="new-input"
          />
          <div className="new-option-buttons">
            <button
              className="cancel-button"
              onClick={() => setShowNewSite(false)}
            >
              Cancelar
            </button>
            <button
              className="save-new-button"
              onClick={() => newSite.trim() && saveFavorite()}
              disabled={!newSite.trim()}
            >
              Salvar
            </button>
          </div>
        </div>
      );
    }

    return (
      <>
        <div className="search-box">
          <input
            type="text"
            value={searchSite}
            onChange={(e) => {
              setSearchSite(e.target.value);
              setSelectedSite("");
            }}
            placeholder="Buscar site..."
            className="search-input"
          />
        </div>

        <div className="select-container">
          {filteredSites.length > 0 ? (
            <select
              value={selectedSite}
              onChange={(e) => setSelectedSite(e.target.value)}
              size={Math.min(filteredSites.length, 5)}
              className="site-select"
            >
              {filteredSites.map((item, index) => (
                <option key={index} value={item.Site}>
                  {item.Site} ({item.Tipo})
                </option>
              ))}
            </select>
          ) : (
            <div className="no-results">
              {Site.length > 0
                ? "Nenhum resultado para esta busca"
                : "Nenhum site disponível"}
            </div>
          )}
        </div>

        <button
          className="add-new-button"
          onClick={() => {
            setShowNewSite(true);
            setSelectedSite("");
          }}
        >
          + Adicionar Novo Site
        </button>
      </>
    );
  };

  // Função para renderizar a ficha do favorito
  const renderFicha = () => {
    if (!showFicha || !currentFavorite) return null;

    return (
      <div className="ficha-container">
        <div className="ficha-header">
          <h3>Ficha do Favorito</h3>
          <button
            className="close-ficha-button"
            onClick={() => setShowFicha(false)}
          >
            ×
          </button>
        </div>

        <div className="ficha-content">
          <div className="ficha-row">
            <span className="ficha-label">ID:</span>
            <span className="ficha-value">{currentFavorite.id}</span>
          </div>

          <div className="ficha-row">
            <span className="ficha-label">Tipo de Objeto:</span>
            <span className="ficha-value">{currentFavorite.tipoObjeto}</span>
          </div>

          <div className="ficha-row">
            <span className="ficha-label">Objeto:</span>
            <span className="ficha-value">{currentFavorite.objeto}</span>
          </div>

          <div className="ficha-row">
            <span className="ficha-label">Site:</span>
            <span className="ficha-value">
              <a
                href={currentFavorite.site}
                target="_blank"
                rel="noopener noreferrer"
              >
                {currentFavorite.site}
              </a>
            </span>
          </div>

          <div className="ficha-row">
            <span className="ficha-label">Tipo de Site:</span>
            <span className="ficha-value">{currentFavorite.siteType}</span>
          </div>

          <div className="ficha-row">
            <span className="ficha-label">Data:</span>
            <span className="ficha-value">
              {new Date(currentFavorite.timestamp).toLocaleString()}
            </span>
          </div>
        </div>

        <div className="ficha-actions">
          <button
            className="edit-ficha-button"
            onClick={() => {
              setShowOptions(true);
              setShowFicha(false);
            }}
          >
            Editar
          </button>
          <button className="remove-ficha-button" onClick={removeFavorite}>
            Remover Favorito
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="favorites-module">
      <button
        onClick={handleFavorite}
        className={`favorite-button ${isFavorite ? "favorited" : ""}`}
      >
        {isFavorite ? "★ Favoritado" : "☆ Favoritar"}
      </button>

      {showConfirmation && (
        <div className="confirmation-message">
          Licitação {isFavorite ? "atualizada nos" : "adicionada aos"}{" "}
          favoritos!
        </div>
      )}

      {showOptions && (
        <div className="favorite-options-modal">
          <div className="modal-header">
            <h3>Categorizar Favorito</h3>
            <button
              className="close-modal-button"
              onClick={() => setShowOptions(false)}
            >
              ×
            </button>
          </div>

          <div className="options-container">
            <div className="option-section">
              <h4>Tipo de Objeto:</h4>
              {renderTipoObjetoOptions()}
            </div>

            <div className="option-section">
              <h4>Site:</h4>
              {renderSiteOptions()}
            </div>
          </div>

          <div className="modal-actions">
            <button
              onClick={() => setShowOptions(false)}
              className="cancel-modal-button"
            >
              Cancelar
            </button>
            <button
              onClick={saveFavorite}
              className="save-modal-button"
              disabled={
                (!selectedTipoObjeto && !showNewTipoObjeto && !newTipoObjeto) ||
                (!selectedSite && !showNewSite && !newSite)
              }
            >
              Salvar Favorito
            </button>
          </div>
        </div>
      )}

      {renderFicha()}
    </div>
  );
};

FavoritesModule.propTypes = {
  licitacao: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    objeto: PropTypes.string,
    orgao_site: PropTypes.string,
    link_edital: PropTypes.string,
  }),
  onUpdate: PropTypes.func,
};

FavoritesModule.defaultProps = {
  licitacao: {
    id: "",
    objeto: "",
    orgao_site: "",
    link_edital: "",
  },
  onUpdate: () => {},
};

export default FavoritesModule;
