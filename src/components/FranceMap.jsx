import { useEffect, useMemo, useRef, useState } from "react";
import { geoConicConformal, geoPath } from "d3-geo";

import "./FranceMap.css";
import prefectures from "../data/prefectures";

const normalize = (value = "") =>
  value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export default function FranceMap({
  onSelect,
  entries = {},
  selectedCode,
  showCorsica,
}) {
  const containerRef = useRef(null);
  const [geojson, setGeojson] = useState(null);
  const [size, setSize] = useState({ width: 900, height: 800 });
  const [zoom, setZoom] = useState(1);
  const [query, setQuery] = useState("");

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}maps/departements.geojson`)
      .then((response) => response.json())
      .then(setGeojson)
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (!containerRef.current) return undefined;
    const observer = new ResizeObserver(([entry]) => {
      setSize({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const visibleGeojson = useMemo(() => {
    if (!geojson) return null;
    return {
      ...geojson,
      features: geojson.features.filter((feature) => {
        const code = feature.properties.code;
        return showCorsica || (code !== "2A" && code !== "2B");
      }),
    };
  }, [geojson, showCorsica]);

  const projection = useMemo(() => {
    if (!visibleGeojson) return null;
    const nextProjection = geoConicConformal();
    const topSpace = size.width > 600 ? 68 : 88;
    nextProjection.fitExtent(
      [[32, topSpace], [size.width - 32, size.height - 26]],
      visibleGeojson,
    );
    return nextProjection;
  }, [visibleGeojson, size]);

  const pathGenerator = useMemo(
    () => (projection ? geoPath(projection) : null),
    [projection],
  );

  const results = useMemo(() => {
    const needle = normalize(query.trim());
    if (!needle) return [];
    return Object.entries(prefectures)
      .filter(([code]) => showCorsica || (code !== "2A" && code !== "2B"))
      .filter(([code, info]) =>
        normalize(`${code} ${info.department} ${info.prefecture}`).includes(needle),
      )
      .slice(0, 6);
  }, [query, showCorsica]);

  function selectDepartment(code, fallbackName) {
    const info = prefectures[code];
    onSelect({ code, nom: info?.department || fallbackName || code });
    setQuery("");
  }

  return (
    <section ref={containerRef} className="map-wrapper" aria-label="Carte des départements français">
      <div className="map-search-wrap">
        <div className="map-search">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Rechercher un département ou une préfecture..."
            aria-label="Rechercher un département ou une préfecture"
          />
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4 4" /></svg>
        </div>
        {query && (
          <div className="search-results">
            {results.length ? results.map(([code, info]) => (
              <button key={code} type="button" onClick={() => selectDepartment(code, info.department)}>
                <span>{info.department}</span>
                <small>{code} · {info.prefecture}</small>
              </button>
            )) : <p>Aucun résultat</p>}
          </div>
        )}
      </div>

      <div className="map-controls" aria-label="Contrôles de la carte">
        <div className="zoom-group">
          <button type="button" aria-label="Zoomer" onClick={() => setZoom((value) => Math.min(1.8, value + 0.2))}>+</button>
          <button type="button" aria-label="Dézoomer" onClick={() => setZoom((value) => Math.max(0.8, value - 0.2))}>−</button>
        </div>
        <button className="home-control" type="button" aria-label="Réinitialiser la carte" onClick={() => setZoom(1)}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 11 9-8 9 8v9a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1v-9Z" /></svg>
        </button>
      </div>

      {!visibleGeojson || !pathGenerator ? (
        <div className="map-loading">Chargement de la carte…</div>
      ) : (
        <svg className="france-svg" width={size.width} height={size.height} role="img">
          <g
            className="map-zoom-layer"
            style={{ transform: `translate(${size.width / 2}px, ${size.height / 2}px) scale(${zoom}) translate(${-size.width / 2}px, ${-size.height / 2}px)` }}
          >
            {visibleGeojson.features.map((feature) => {
              const code = feature.properties.code;
              const name = feature.properties.nom;
              const visitedByOne = Boolean(entries[code]?.[1]?.visited);
              const visitedByTwo = Boolean(entries[code]?.[2]?.visited);
              const visitClass = visitedByOne && visitedByTwo
                ? " visited-both"
                : visitedByOne
                  ? " visited-user-one"
                  : visitedByTwo
                    ? " visited-user-two"
                    : "";
              const selected = selectedCode === code;
              const [x, y] = pathGenerator.centroid(feature);
              return (
                <g key={code} className="department-group" onClick={() => selectDepartment(code, name)}>
                  <path
                    d={pathGenerator(feature)}
                    className={`department${visitClass}${selected ? " selected" : ""}`}
                  >
                    <title>{code} — {name}</title>
                  </path>
                  {Number.isFinite(x) && Number.isFinite(y) && (
                    <text x={x} y={y} className={`department-label${selected ? " selected" : ""}`}>{code}</text>
                  )}
                </g>
              );
            })}
          </g>
        </svg>
      )}
    </section>
  );
}
