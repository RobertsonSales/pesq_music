/**
 * /api/proxy.js — Vercel Serverless Function
 *
 * Encaminha chamadas à YouTube Data API v3 sem expor a chave no front-end.
 * A chave é lida da variável de ambiente YT_KEY, configurada no painel do Vercel.
 *
 * Parâmetros de query recebidos do front-end:
 *   endpoint  → "search" | "videos"  (obrigatório)
 *   ...rest   → demais parâmetros da API do YouTube (part, q, type, etc.)
 *
 * Exemplo de chamada gerada pelo front-end:
 *   /api/proxy?endpoint=search&part=snippet&q=rock+music&type=video&maxResults=20
 *   /api/proxy?endpoint=videos&part=contentDetails&id=abc123,def456
 */
export default async function handler(req, res) {
    // Só aceita GET
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Método não permitido' });
    }

    const { endpoint, ...params } = req.query;

    // Valida o endpoint solicitado
    const ENDPOINTS = {
        search: 'https://www.googleapis.com/youtube/v3/search',
        videos: 'https://www.googleapis.com/youtube/v3/videos',
    };

    if (!endpoint || !ENDPOINTS[endpoint]) {
        return res.status(400).json({ error: 'Parâmetro "endpoint" inválido ou ausente.' });
    }

    // Garante que a chave está configurada no ambiente
    if (!process.env.YT_KEY) {
        return res.status(500).json({ error: 'Variável de ambiente YT_KEY não configurada.' });
    }

    try {
        // Monta a URL final injetando a chave server-side
        const queryString = new URLSearchParams({
            ...params,
            key: process.env.YT_KEY,
        }).toString();

        const ytUrl = `${ENDPOINTS[endpoint]}?${queryString}`;

        const ytResponse = await fetch(ytUrl);
        const data = await ytResponse.json();

        // Repassa o status original da API do YouTube
        res.status(ytResponse.status).json(data);
    } catch (error) {
        console.error('[proxy] Erro ao acessar a YouTube API:', error);
        res.status(500).json({ error: 'Erro interno ao acessar a API.' });
    }
}
