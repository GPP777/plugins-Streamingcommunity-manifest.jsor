const { Extension, HttpRequest } = require('cloudstream');

class Altadefinizione extends Extension {
    constructor() {
        super();
        this.baseUrl = "https://altadefinizione-01.forum";
    }

    // 1. Ricerca dei film sul sito
    async search(query) {
        // Usiamo il sistema di ricerca nativo di WordPress (?s=query)
        const response = await HttpRequest.get(`${this.baseUrl}/?s=${encodeURIComponent(query)}`);
        const html = response.body;
        
        // Espressione regolare per catturare i titoli, i link e le locandine dalle anteprime
        const matches = [...html.matchAll(/<div class="poster">.*?<a href="(https:\/\/altadefinizione-01\.forum\/[^"]+?)".*?title="([^"]+?)".*?src="([^"]+?)"/gs)];
        
        return matches.map(match => ({
            name: match[2],
            url: match[1],
            posterUrl: match[3],
            type: "movie" // Altadefinizione si concentra principalmente sui film
        }));
    }

    // 2. Caricamento dei dettagli della scheda del film
    async loadDetails(url) {
        const response = await HttpRequest.get(url);
        const html = response.body;

        // Estraiamo la trama (plot) e il titolo principale
        const titleMatch = html.match(/<h1 class="entry-title">([^<]+?)</) || html.match(/<h1>([^<]+?)</);
        const plotMatch = html.match(/<div class="wp-content">.*?<p>(.*?)<\/p>/s) || html.match(/<meta name="description" content="([^"]+?)"/);
        const posterMatch = html.match(/<div class="poster">.*?src="([^"]+?)"/s);

        const name = titleMatch ? titleMatch[1].trim() : "Film senza titolo";
        const description = plotMatch ? plotMatch[1].trim() : "Nessuna trama disponibile.";
        const poster = posterMatch ? posterMatch[1] : "";

        // Creiamo l'unico "episodio" per il film che punta alla stessa pagina (dove ci sono i player)
        const episodes = [{
            name: name,
            url: url
        }];

        return {
            name: name,
            description: description,
            posterUrl: poster,
            episodes: episodes
        };
    }

    // 3. Estrazione dei link dei vari player video (Supervideo, Mixdrop, ecc.)
    async loadVideoSources(episodeUrl) {
        const response = await HttpRequest.get(episodeUrl);
        const html = response.body;
        
        const sources = [];

        // Cerchiamo i link degli iframe video o dei player esterni caricati nella pagina
        const iframeMatches = [...html.matchAll(/<iframe.*?src="([^"]+?)"/g)];
        
        iframeMatches.forEach(match => {
            const videoUrl = match[1];
            
            // Filtriamo e aggiungiamo solo i link che assomigliano a flussi video stabili
            if (videoUrl.includes('supervideo') || videoUrl.includes('mixdrop') || videoUrl.includes('streamtape')) {
                sources.push({
                    url: videoUrl,
                    quality: "HD (External Player)",
                    isM3u8: videoUrl.includes('.m3u8')
                });
            }
        });

        return sources;
    }
}

module.exports = Altadefinizione;
