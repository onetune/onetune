var translations = {
	LIBRARY: {
		en: 'Library',
		pt: 'Biblioteca',
		de: 'Bibliothek'
	},
	HOME: {
		en: 'Home',
		pt: 'Início',
		de: 'Start'
	},
	SHOW_VIDEO: {
		en: 'Show video',
		pt: 'Mostrar vídeo',
		de: 'Video zeigen'
	},
	LOGIN_OR_REGISTER: {
		en: 'Login or register',
		pt: 'Login ou registro',
		de: 'Login oder registrieren'
	},
	LOGOUT: {
		en: 'Logout',
		pt: 'Sair',
		de: 'Ausloggen'
	},
	MY_MUSIC: {
		en: 'My music',
		pt: 'Minhas músicas',
		de: 'Meine Musik'
	},
	PLAYLISTS: {
		en: 'Playlists',
		pt: 'Playlists',
		de: 'Playlisten'
	},
	NEW_PLAYLIST: {
		en: 'New playlist',
		pt: 'Nova playlist',
		de: 'Neue Playlist'
	},
	DISCOVER: {
		en: 'Discover',
		pt: 'Descubra',
		de: 'Entdecken'
	},
	FOLLOWED_PLAYLISTS: {
		en: 'Followed playlists',
		pt: 'Playlists que sigo',
		de: 'Gefolgte Playlists'
	},
	TOP_CHARTS: {
		en: 'Top Charts',
		pt: 'Mais Tocadas',
		de: 'Charts'
	},
	GENRES: {
		en: 'Genres',
		pt: 'Gêneros',
		de: 'Genres'
	},
	TIME_MACHINE: {
		en: 'Time Machine',
		pt: 'Máquina do Tempo',
		de: 'Zeitmaschine'
	},
	COMMUNITIES: {
		en: 'Communities',
		pt: 'Comunidades',
		de: 'Communities'
	},
	ABOUT: {
		en: 'About',
		pt: 'Sobre nós',
		de: 'Über uns'
	},
	SETTINGS: {
		en: 'Settings',
		pt: 'Ajustes',
		de: 'Einstellungen'
	},
	IMPORT: {
		en: 'Import',
		pt: 'Importar',
		de: 'Import'
	},
	DROP_MUSIC_HERE: {
		en: 'Drop your music here',
		pt: 'Arraste e solte músicas aqui',
		de: 'Ziehe deine Musik in dieses Fenster'
	},
	DROP_SPOTIFY_FILES: {
		en: 'You can drop Spotify files here.',
		pt: 'Arraste e solte músicas do Spotify aqui.',
		de: 'Du kannst Spotify-Titel hier importieren.'
	},
	IMPORT_OTHER_SERVICES: {
		en: 'Import from other services will be available soon.',
		pt: 'Importação de outros serviços estarão disponíveis em breve.',
		de: 'Importieren durch andere Services wird bald verfügbar sein.'
	},
	SONGS_ALBUMS_ARTISTS: {
		en: 'Songs, albums, artists.',
		pt: 'Músicas, álbuns, artistas.',
		de: 'Songs, Alben, Künstler'
	},
	SEARCH_DISCOVER_MUSIC: {
		en: 'Start searching and discover the world of music.',
		pt: 'Inicie sua busca e descubra o mundo da música.',
		de: 'Suche und entdecke die Welt der Musik.'
	},
	SEARCH_PLACEHOLDER: {
		en: 'Search for songs or artists...',
		pt: 'Busque por músicas ou artistas...',
		de: 'Suche nach Songs oder Künstlern...'
	}

}
translations.get = function (id, language) {
	if (!id) {
		console.error('No language identifier set.');
		return;
	}
	if (!language) {
		console.error('No language found.');
		return;
	}
	if (!translations[id]) {
		console.error('Invalid translation identifier.');
		return;
	}
	if (!translations[id][language]) {
		if (!translations[id].en) {
			console.error('No translation and no default string found.')
			return;
		}
		return translations[id].en;
	}
	return translations[id][language];
}
if (typeof exports != 'undefined') {
	exports.translations = translations;
}
