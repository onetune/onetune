errors = {
	draw: function(code) {
		$("#view").load("/api/error/" + code);
		views.loadingindicator.hide();
	}
}