var _ = require('underscore');
var remappers = {
	'/common/topic/description': function(info) {
		return info.values[0].value;
	},
	'/common/topic/alias': function(info) {
		return _.pluck(info.values, 'text');
	},
	'/award/ranked_item/appears_in_ranked_lists': function(info) {
		return _.first(_.map(info.values, function (value) {
			var rank = value.property['/award/ranking/rank'],
				list = value.property['/award/ranking/list'] ,
				year = value.property['/award/ranking/year'];
			return {
				rank: (rank ? rank.values[0].value 	: null),
				list: (list ? list.values[0].text 	: null),
				year: (year ? year.values[0].text 	: null)
			}
		}) , 3);
	},
	'/award/award_winner/awards_won': function(info) {
		return _.first(_.map(info.values, function (value) {
			var award = value.property['/award/award_honor/award'],
				year  = value.property['/award/award_honor/year'];
			return {
				award: (award ? award.values[0].text: null),
				year:  (year ? year.values[0].text 	: null)
			}
		}) , 3);
	},
	'/common/topic/image': function(info) {
		return info.values[0].id;
	},
	'/common/topic/official_website': function(info) {
		return _.pluck(info.values, 'value');
	},
	'/film/actor/film': function(info) {
		return _.first(_.map(info.values, function (value) {
			var film  = value.property['/film/performance/film'],
				type  = value.property['/film/performance/special_performance_type'],
				role  = value.property['/film/performance/character'];
			return {
				film: 	(film ? film.values[0].text : null),
				type: 	(type ? type.values[0].text : null),
				role:   (role ? role.values[0].text : null)
			}
		}), 3)
	},
	'/music/artist/concert_tours': function(info) {
		return _.pluck(info.values, 'text');
	},
	'/music/artist/genre': function(info) {
		return _.first(_.pluck(info.values, 'text'), 3);
	},
	'/music/artist/label': function(info) {
		return _.first(_.pluck(info.values, 'text'), 3);
	},
	'/music/artist/origin': function(info) {
		return _.first(_.pluck(info.values, 'text'));
	},
	'/music/artist/active_start': function(info) {
		return info.values[0].text;
	},
	'/music/artist/active_end': function(info) {
		return info.values[0].text.substr(0,4);
	},
	'/music/artist/home_page': function(info) {
		return info.values[0].property['/common/webpage/uri'].values[0].text;
	},
	'/music/musical_group/member': function(info) {
		return _.map(info.values, function (value) {
			var name  = value.property['/music/group_membership/member'],
				role  = value.property['/music/group_membership/role'];
			return {
				name: (name ? name.values[0].text : null),
				role: (role ? _.pluck(role.values, 'text') : null)
			}
		});
	},
	'/music/group_member/instruments_played': function(info) {
		return _.first(_.pluck(info.values, 'text'), 3);
	},
	'/people/person/date_of_birth': function(info) {
		return info.values[0].text;
	},
	'/people/person/employment_history': function(info) {
		return _.map(info.values, function(values) { return values.property['/business/employment_tenure/company'].values[0].text });
	},
	'/people/person/ethnicity': function(info) {
		return info.values[0].text;
	},
	'/people/person/gender': function(info) {
		return info.values[0].text;
	},
	'/people/person/height_meters': function(info) {
		return info.values[0].value;
	},
	'/people/person/languages': function(info) {
		return info.values[0].text;
	},
	'/people/person/nationality': function(info) {
		return info.values[0].text;
	},
	'/people/person/parents': function(info) {
		return _.pluck(info.values, 'text');
	},
	'/people/deceased_person/cause_of_death': function(info) {
		return _.pluck(info.values, 'text');
	},
	'/people/deceased_person/date_of_burial': function(info) {
		return info.values[0].value;
	},
	'/people/deceased_person/place_of_burial': function(info) {
		return info.values[0].text;
	},
	'/people/deceased_person/date_of_death': function(info) {
		return info.values[0].value;
	},
	'/people/deceased_person/place_of_death': function(info) {
		return info.values[0].text;
	},
	'/people/person/place_of_birth': function(info) {
		return info.values[0].text;
	},
	'/influence/influence_node/influenced_by': function(info) {
		return _.pluck(info.values, 'text');
	},
	'/celebrities/celebrity/substance_abuse_problems': function(info) {
		return _.map(info.values, function(value) { return value.property['/celebrities/substance_abuse_problem/substance'].values[0].text; });
	}
}
exports.remap = function (obj) {
	var endproduct = {};
	_.each(obj, function (value, key) {
		var keysplit = key.split('/')
		if (remappers[key]) {
			endproduct[keysplit[keysplit.length-1]] = remappers[key](value)
		}
	});
	return endproduct;
}