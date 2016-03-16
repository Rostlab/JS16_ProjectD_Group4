# GoT Twitter Sentiment Analysis

## Installing

```sh
npm install grunt-cli -g
npm install
```

## Run
Currently the package has two main files: `app.js` (web app) and `crawler.js` for the crawler.

### WebApp
```sh
node app
```

### Crawler
```sh
node crawler
```

You can set the tasks that the crawler runs in `crawler.js`.

## Testing
```sh
npm test
```

### Hook up npm and git
To run `npm test` automatically before every git commit, install a git pre-commit hook:

```sh
npm run hookup
```

git aborts the commit if the tests fail. You can (but shouldn't) bypass it with `git commit --no-verify ...`.
