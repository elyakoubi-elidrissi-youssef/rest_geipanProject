var MongoClient = require('mongodb').MongoClient;
var ObjectId = require('mongodb').ObjectID;

var assert = require('assert');
//var url = 'mongodb://localhost:27017/test';

// Connection URL
const url = 'mongodb://localhost:27017';

// Database Name
const dbName = 'geipan';
const collection = 'cases';

exports.connexionMongo = function(callback) {
	MongoClient.connect(url,{ useUnifiedTopology: true}, function(err, client) {
		assert.equal(null, err);
		callback(err, client);
	});
}

exports.findCases = function(page, pagesize,filter, callback) {
	MongoClient.connect(url,{ useUnifiedTopology: true}, async function(err, client) {
		var db = client.db(dbName);
		let a_filter = {};
		if(filter != undefined)
		{
			if(filter.zone != '' && filter.zone != '0')
			{
				a_filter['cas_zone_nom'] = filter.zone;
			}


			if(filter.classe_cas != 'tous')
			{
				a_filter['cas_classification'] = filter.classe_cas;
			}

			if(filter.date_debut != '' || filter.date_fin != '' )
			{
				a_filter['cas_date_maj']  ={};

			}
			if(filter.date_debut != '')
			{
				a_filter['cas_date_maj']['$gte'] = '' +  new Date(filter.date_debut).toISOString();
			}

			if(filter.date_fin != '')
			{
				a_filter['cas_date_maj']['$lte'] =  '' + new Date(filter.date_fin).toISOString();
			}

			if(filter.texte_resume != '')
			{
				a_filter['cas_resume_web'] = {$regex : ".*(" +  filter.texte_resume + ").*"};
			}
		}
		console.log(a_filter);

		if(!err){
			let total = (await db.collection(collection)
				.find(a_filter).count());
			db.collection(collection)
				.find(a_filter)
				.skip((page-1)*pagesize)
				.limit(pagesize)
				.toArray()
				.then(arr => callback(arr ,total));
		}
		else{
			callback(-1);
		}
	});
};
