this.settings = [
	{
		key: 'favicon_album',
		value: false,
		label: 'Use the album cover as favicon'
	}
	,
	{
		key: 'warn_before_leave',
		value: false,
		label: 'Warn me when I leave and the music is still playing.'
	}
]
/*
	This is a template for subs. You need to go to the admin panel to activate these subs!
*/
exports.subs = [
	{
		name: 'kpop',
		reddit: 'KPop',
		order: 50,
		itunes: 'https://itunes.apple.com/us/rss/topsongs/limit=100/genre=51/explicit=true/json',
		header: 'kpop-banner.png'
	},
	{
		name: 'brazil',
		reddit: 'BrazilianMusic',
		order: 60,
		itunes: 'https://itunes.apple.com/us/rss/topsongs/limit=100/genre=1122/explicit=true/json',
		header: 'brazil-banner.png'
	}
];