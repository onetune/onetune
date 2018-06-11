/*
	The actual queues logic is in player.js
	This is just a builder for /queues
*/
queues = {
	showSidebar: function() {
		$('#sidebar-queue').html(templates.buildSidebarQueue({}));
	}
}
