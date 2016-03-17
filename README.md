[![Build Status](https://travis-ci.org/Rostlab/JS16_ProjectD_Group4.svg?branch=master)](https://travis-ci.org/Rostlab/JS16_ProjectD_Group4)
# GoT Twitter Sentiment Analysis

## Installing
Dendencies:
- recent node.js + npm
- MongoDB

Install npm dependencies:
```sh
npm install -g gulp
npm install
```

Afterwards adjust `config.json`. You need to need to [create a Twitter API key](https://apps.twitter.com/) for the crawler.

## Run
Currently the package has two main files: `app.js` (web app) and `crawler.js` for the crawler.

### WebApp
```sh
node app
```

`/` Will provide an overview with the most popular characters

`/character-name` shows the graph for a character

`/character-name.csv` returns the raw data as CSV

### Crawler
```sh
node crawler
```

You can set the tasks that the crawler runs in `crawler.js`.

## Testing
```sh
gulp test
```

### Hook up npm and git
To run `gulp lint` automatically before every git commit, install a git pre-commit hook:

```sh
gulp hook
```

git aborts the commit if the tests fail. You can (but shouldn't) bypass it with `git commit --no-verify ...`.
