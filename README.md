# gotsentimental [![Build Status](https://travis-ci.org/Rostlab/JS16_ProjectD_Group4.svg?branch=develop)](https://travis-ci.org/Rostlab/JS16_ProjectD_Group4) [![npm](https://img.shields.io/npm/v/gotsentimental.svg)](https://www.npmjs.com/package/gotsentimental)
GoT Twitter Sentiment Analysis

## Installing
```sh
$ npm install gotsentimental --save
```

Dependencies:
- recent node.js + npm
- MongoDB

## Usage
You need to [create a Twitter API key](https://apps.twitter.com/) for the crawler.

Example:
```js
const gotsent = require('gotsentimental');

// adjust config
gotsent.cfg.extend({
    "mongodb": {
        "uri": "mongodb://example/gotsentimental"
    },
    "twitter": {
        "access_token": "xxx",
        "access_token_secret": "xxx",
        "consumer_key": "xxx",
        "consumer_secret": "xxx"
    }
});

// initilize
gotsent.init();

// update DB - this might take a few hours
gotsent.update().then(function(res) {
    // print some update stats
    console.log(res);

    // get top5 most popular characters
    gotsent.mostPopular(5).then(function(res) {
        res.forEach(function(character) {
            console.log(character.name);
        });
    }, console.error);

    // gracefully shut down
    gotsent.shutdown();
}, function(err) {
    console.error(err);
    gotsent.shutdown();
});
```

## API
### Types

#### Character

| Name | Type | Description |
| --- | --- | --- |
| name | <code>string</code> | name of the character |
| slug | <code>string</code> | human-readale URL-identifier for the character |
| _id | <code>string</code> | unique ID |
| total | <code>number</code> | total number of tweets in database |
| positive | <code>number</code> | total number of positive tweets in database |
| negative | <code>number</code> | total number of negative tweets in database |
| heat | <code>number</code> | how controverse is the character |
| popularity | <code>number</code> | how much is the character is discussed |
| updated | <code>Date</code> | date when the document was last updated |

### Methods and Attributes

* [.cfg](#gotsentimental.cfg) : <code>Object</code>
* [.cfg.extend(json)](#gotsentimental.cfg.extend)
* [.css](#gotsentimental.css)
* [.js](#gotsentimental.js)
* [.init()](#gotsentimental.init)
* [.shutdown()](#gotsentimental.shutdown)
* [.update([full])](#gotsentimental.update) ⇒ <code>Promise.&lt;Object&gt;</code>
* [.updateCharacter(id, [full])](#gotsentimental.updateCharacter) ⇒ <code>Promise.&lt;Object&gt;</code>
* [.character(id)](#gotsentimental.character) ⇒ <code>Promise.&lt;Character&gt;</code>
* [.mostPopular([n])](#gotsentimental.mostPopular) ⇒ <code>Promise.&lt;Array.&lt;Character&gt;&gt;</code>
* [.mostHated([n])](#gotsentimental.mostHated) ⇒ <code>Promise.&lt;Array.&lt;Character&gt;&gt;</code>
* [.mostDiscussed([n])](#gotsentimental.mostDiscussed) ⇒ <code>Promise.&lt;Array.&lt;Character&gt;&gt;</code>

<a name="gotsentimental.cfg"></a>
#### gotsentimental.cfg : <code>Object</code>
Object containing the package configuration.
The config can be changed by directly overwriting attributes or using
[.cfg.extend(json)](#gotsentimental.cfg.extend).

<a name="gotsentimental.cfg.extend"></a>
#### gotsentimental.cfg.extend(json)
Merges the given Object into the config by overwriting attributes. Arrays are concatenated.

| Param | Type | Description |
| --- | --- | --- |
| json | <code>Object</code> | Config Object |

<a name="gotsentimental.init"></a>
#### gotsentimental.init()
Initilaize the package.
Opens the MongoDB connection and initializes the Twitter client.


<a name="gotsentimental.shutdown"></a>
#### gotsentimental.shutdown()
Close any open resources like the database connection.


<a name="gotsentimental.update"></a>
#### gotsentimental.update([full]) ⇒ <code>Promise.&lt;Object&gt;</code>
Update data by crawling for new tweets and generating new CSV files.

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| [full] | <code>boolean</code> | <code>false</code> | full rebuild or incremental update |

**Returns**: <code>Promise.&lt;Object&gt;</code> - A promise to the update results.

<a name="gotsentimental.updateCharacter"></a>
#### gotsentimental.updateCharacter(id, [full]) ⇒ <code>Promise.&lt;Object&gt;</code>
Update data for given [character](#character) by crawling for new tweets and generating
new CSV files.

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| id | <code>string</code> |  | ID of the character |
| [full] | <code>boolean</code> | <code>false</code> | full rebuild or incremental update |

**Returns**: <code>Promise.&lt;Object&gt;</code> - A promise to the update results.

<a name="gotsentimental.character"></a>
#### gotsentimental.character(id) ⇒ <code>Promise.&lt;Character&gt;</code>
Get a [character](#character) by ID.

**Returns**: <code>Promise.&lt;Character&gt;</code> - A promise to the [character](#character).

| Param | Type | Description |
| --- | --- | --- |
| id | <code>string</code> | ID of the character |

<a name="gotsentimental.mostPopular"></a>
#### gotsentimental.mostPopular([n]) ⇒ <code>Promise.&lt;Array.&lt;Character&gt;&gt;</code>
Get the most popular [characters](#character).

**Returns**: <code>Promise.&lt;Array.&lt;Character&gt;&gt;</code> - A promise to the array of [characters](#character)

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| [n] | <code>number</code> | <code>10</code> | Number of Characters to return |

<a name="gotsentimental.mostHated"></a>
#### gotsentimental.mostHated([n]) ⇒ <code>Promise.&lt;Array.&lt;Character&gt;&gt;</code>
Get the most hated [characters](#character).

**Returns**: <code>Promise.&lt;Array.&lt;Character&gt;&gt;</code> - A promise to the array of [characters](#character)

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| [n] | <code>number</code> | <code>10</code> | Number of characters to return |

<a name="gotsentimental.mostDiscussed"></a>
#### gotsentimental.mostDiscussed([n]) ⇒ <code>Promise.&lt;Array.&lt;Character&gt;&gt;</code>
Get the most discussed [characters](#character).

**Returns**: <code>Promise.&lt;Array.&lt;Character&gt;&gt;</code> - A promise to the array of [characters](#character)

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| [n] | <code>number</code> | <code>10</code> | Number of Characters to return |

<a name="gotsentimental.css"></a>
#### gotsentimental.css
The Chart CSS file

| Name | Type | Description |
| --- | --- | --- |
| path | <code>string</code> | Absolute path to file |
| serve | <code>function</code> | HTTP handler to serve file |

<a name="gotsentimental.js"></a>
#### gotsentimental.js
The Chart JS file

| Name | Type | Description |
| --- | --- | --- |
| path | <code>string</code> | Absolute path to file |
| serve | <code>function</code> | HTTP handler to serve file |

## Testing
Install Gulp:
```sh
npm install -g gulp
```

```sh
npm test
```

### Hook up npm and git
To run `npm test` automatically before every git commit, install a git pre-commit hook:

```sh
npm run hookup
```

git aborts the commit if the tests fail. You can (but shouldn't) bypass it with `git commit --no-verify ...`.
