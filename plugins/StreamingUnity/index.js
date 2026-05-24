const { Extension, HttpRequest } = require('cloudstream');

class StreamingUnity extends Extension {
    constructor() {
        super();
        this.baseUrl = "https://streamingunity.dog";
    }

    async search(query) {
        const response = await HttpRequest.get(`${this.baseUrl}/api/search?q=${encodeURIComponent(query)}`);
        const json = JSON.parse(response.body);
        return json.data.map(item => ({
            name: item.name || item.title,
            url: `${this.baseUrl}/${item.type === 'tv' ? 'tv' : 'titles'}/${item.id}-${item.slug}`,
            posterUrl: item.images?.poster || item.poster,
            type: item.type === 'tv' ? 'tvSeries' : 'movie'
        }));
    }

    async loadDetails(url) {
        const response = await HttpRequest.get(url);
        const html = response.body;
        const dataMatch = html.match(/window\.__DATA__\s*=\s*({.*?});/);
        if (!dataMatch) return null;
        
        const pageData = JSON.parse(dataMatch[1]);
        const titleData = pageData.title;
        const description = titleData.plot;
        const poster = titleData.images?.poster;

        let episodes = [];
        if (titleData.seasons) {
            titleData.seasons.forEach(season => {
                season.episodes.forEach(ep => {
                    episodes.push({
                        name: ep.name,
                        episode: ep.number,
                        season: season.number,
                        url: `${this.baseUrl}/iframe/${titleData.id}?episode=${ep.id}`
                    });
                });
            });
        } else {
            episodes.push({
                name: titleData.name,
                url: `${this.baseUrl}/iframe/${titleData.id}`
            });
        }

        return {
            name: titleData.name,
            description: description,
            posterUrl: poster,
            episodes: episodes
        };
    }

    async loadVideoSources(episodeUrl) {
        const response = await HttpRequest.get(episodeUrl);
        const html = response.body;
        const streamUrlMatch = html.match(/file"\s*:\s*"(https:\/\/.*?\.m3u8.*?)"/);
        
        const sources = [];
        if (streamUrlMatch) {
            sources.push({
                url: streamUrlMatch[1],
                quality: "Auto (HLS)",
                isM3u8: true
            });
        }
        return sources;
    }
}

module.exports = StreamingUnity;
