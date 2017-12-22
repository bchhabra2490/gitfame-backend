module.exports = {
  fetchData: function(req, res) {
    return fetch('https://api.github.com/graphql', {
      method: 'POST',
      body: JSON.stringify(payload.userPayload(req.body.name, true, null)),
      headers: {
        'Authorization': 'bearer ' + process.env.GIT_TOKEN,
        'Content-Type': 'application/json'
      }
    })
      .then(response => {
        if (response.ok) return response.json();

        throw new Error('error');
      })
      .then(userData => {
        let userInfo = {
          'success': true,
        };

        if (userData['data'] === null) throw new Error(userData['errors'][0]['message']);
        if (userData['data']['user'] === null) throw new Error('Not found');

        userData = userData['data']['user'];
        userInfo['public_repos'] = userData['repositories']['totalCount'];
        userInfo['avatar_url'] = userData['avatarUrl'];
        userInfo['followers'] = userData['followers']['totalCount'];
        userInfo['following'] = userData['following']['totalCount'];
        userInfo['html_url'] = userData['url'];
        userInfo['id'] = userData['id'];
        userInfo['login'] = userData['login'];
        userInfo['name'] = userData['name'];
        userInfo['bio'] = userData['bio'];
        userInfo['createdAt'] = userData['createdAt'];
        userInfo['commits'] = 0;
        userInfo['stars'] = 0;
        userInfo['forks'] = 0;
        userInfo['watchers'] = 0;
        userInfo['languages'] = [];
        userInfo['repos'] = [];

        return userInfo;
      })
      .then(userInfo => {
        // get repositories and contributions
        let repositoryPromises = [];
        repositoryPromises.push(traverseAllCursors(null));

        function traverseAllCursors(endCursor) {
          return fetch('https://api.github.com/graphql', {
            method: 'POST',
            body: JSON.stringify(payload.reposPayload(userInfo['login'], userInfo['id'], endCursor)),
            headers: {
              'Authorization': 'bearer ' + process.env.GIT_TOKEN,
              'Content-Type': 'application/json'
            }
          })
            .then(response => {
              if (response.ok) return response.json();

              throw new Error('error');
            })
            .then(userData => {
              if (userData['data'] === null) throw new Error(userData['errors'][0]['message']);

              userData = userData['data']['user'];
              let repos = [];
              for (let i = 0; i < userData['repositories']['nodes'].length; i++) {
                let repoNode = userData['repositories']['nodes'][i];
                if (repoNode['isFork']) repoNode = repoNode['parent'];

                // contributions null for empty repos
                let userCommits = repoNode['contributions'] ? repoNode['contributions']['target']['userCommits']['totalCount'] : 0;
                let totalCommits = repoNode['contributions'] ? repoNode['contributions']['target']['totalCommits']['totalCount'] : 0;

                repos.push({
                  'full_name': repoNode['nameWithOwner'],
                  'branch': repoNode['branch'] ? repoNode['branch']['name'] : "", // branch null for empty repos
                  'stars': repoNode['stargazers']['totalCount'],
                  'watchers': repoNode['watchers']['totalCount'],
                  'forks': repoNode['forks']['totalCount'],
                  'url': repoNode['url'],
                  'languages': repoNode['languages']['nodes'],
                  'total_commits': totalCommits,
                  'user_commits': userCommits,
                });

                // count total stars, forks and watchers of owned repos
                if (userInfo['login'] === repoNode['owner']['login']) {
                  userInfo['stars'] += repoNode['stargazers']['totalCount'];
                  userInfo['forks'] += repoNode['forks']['totalCount'];
                  userInfo['watchers'] += repoNode['watchers']['totalCount'];
                }

                // count total commits in owned or parent of forked repos.
                userInfo['commits'] += userCommits;

                let languages = repoNode['languages']['nodes'];
                for (let j = 0; j < languages.length; j++) {
                  let flag = 0;
                  for (let k = 0; k < userInfo['languages'].length; k++) {
                    let langPresent = userInfo['languages'][k];

                    if (langPresent['name'] === languages[j]['name']) {
                      langPresent['commits'] += userCommits;
                      langPresent['repos']++;
                      flag = 1;
                      break;
                    }
                  }
                  if (!flag) {
                    userInfo['languages'].push({
                      name: languages[j]['name'],
                      color: languages[j]['color'],
                      commits: userCommits,
                      repos: 1,
                    });
                  }
                }
              }

              if (userData['repositories']['pageInfo']['hasNextPage']) {
                repositoryPromises.push(traverseAllCursors(userData['repositories']['pageInfo']['endCursor']));
              }
              return repos;
            })
            .catch(error => console.log(error.message))
        }

        return Promise.all(repositoryPromises)
          .then((repos) => {
            // add all repos
            for (let i = 0; i < repos.length; i++) {
              userInfo['repos'] = userInfo['repos'].concat(repos[i]);
            }
            return userInfo;
          });
      })
      .then((userInfo) => {
        // sort repositories for most commits and
        userInfo['repos'].sort((l, r) => {
          if (l['user_commits'] < r['user_commits'])
            return 1;
          else if (l['user_commits'] === r['user_commits']) {
            if (l['total_commits'] < r['total_commits'])
              return 1;
            return -1;
          }
          return -1;
        });

        // sort languages for maximum commits
        userInfo['languages'].sort((l, r) => {
          if (l['commits'] <= r['commits']) {
            return 1;
          }
          return -1;
        });

        total_language_sum = 0.0;

        // getting total number of commits for all languages
        for(let i = 0; i < userInfo['languages'].length; i++) {
          total_language_sum += userInfo['languages'][i]['commits'];
        }

        // normalizing score
        for(let i = 0; i < userInfo['languages'].length; i++) {
          userInfo['languages'][i]['commits'] = (userInfo['languages'][i]['commits'] * 100.0) / total_language_sum;
        }

        userInfo['time'] = new Date();
        return userInfo;
      })
  }
};