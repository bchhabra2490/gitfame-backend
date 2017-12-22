const fetch = require('node-fetch');
const payload = require('./../helper/payload');
const fetchInfo = require('./../helper/fetch');
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
            fetchInfo.fetchData(req, res)
              .then((finalData) => {
                // save to db
                finalData['_id'] = finalData['login'];

                db.collection('stats').insert(finalData, (err, result) => {
                  if (err) {
                    console.log('Insert failed. Error - ' + err.message); 
                  } else {
                    console.log('Inserted. ID: ' + result.ops[0]['_id']);
                  }
                });

                return res.json(finalData);
              })
              .catch(error => {
                return res.json({'success': false, 'message': error.message});
              });
          } else {
            // id present in DB
            var staDate = new Date(item['time']); // time when entry was saved
            var curDate = new Date();  // current time

            if((curDate.getTime() - staDate.getTime()) > 86400000) {
              // more than 24 hours old data
              // get new data and update

              fetchInfo.fetchData(req, res)
                .then((finalData) => {
                  // update to db
                  finalData['_id'] = finalData['login'];

                  db.collection('stats').update(idDict, finalData, (err, result) => {
                    if (err) {
                      console.log('Update failed. Error - ' + err.message); 
                    } else {
                      console.log('Updated. ID: ' + finalData['_id']);
                    }
                  });

                  return res.json(finalData);
                })
                .catch(error => {
                  return res.json({'success': false, 'message': error.message});
                });
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
            fetchInfo.fetchData(req, res)
              .then((finalData) => {
                // save to db
                finalData['_id'] = finalData['login'];

                db.collection('stats').insert(finalData, (err, result) => {
                  if (err) {
                    console.log('Insert failed. Error - ' + err.message); 
                  } else {
                    console.log('Inserted. ID: ' + result.ops[0]['_id']);
                  }
                });

                return res.json(finalData);
              })
              .catch(error => {
                return res.json({'success': false, 'message': error.message});
              });
          } else {
            // id present in DB

            return res.json(item);
          }
        });
      }
    }
  });
};