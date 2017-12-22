const insertDb = require('./../helper/db/insert');
require('dotenv').config();

module.exports = function (app, db) {
  app.post('/', (req, res) => {
    if(req.body.name === undefined || req.body.name === null || req.body.latest === undefined || req.body.latest === null) {
      return res.json({'success': false, 'message': 'parameters missing'});
    } else {
      const idDict = {'_id': req.body.name};

      if(req.body.latest === true || req.body.latest == 'true') {
        // if 24 hours passed
        // get new data and save
        // else return whatever's in DB

        db.collection('stats').findOne(idDict, (err, item) => {
          if(err) {
            return res.json({'success': false, 'message': err.message});
          } else if(item === null) {
            // ID not present in DB
            insertDb.insert(db, req.body.name, res);
          } else {
            // id present in DB
            var staDate = new Date(item['time']); // time when entry was saved
            var curDate = new Date();  // current time

            if((curDate.getTime() - staDate.getTime()) > 86400000) {
              // more than 24 hours old data
              // get new data and update

              insertDb.update(db, req.body.name, res);
            } else {
              // data is fresh
              return res.json(item);
            }
          }
        });
      } else {
        // return whatever's in db
        // if nothing in db then get from GitHub and save

        db.collection('stats').findOne(idDict, (err, item) => {
          if(err) {
            return res.json({'success': false, 'message': err.message});
          } else if(item === null) {
            // ID not present in DB
            insertDb.insert(db, idDict, req.body.name, res);
          } else {
            // id present in DB
            return res.json(item);
          }
        });
      }
    }
  });
};