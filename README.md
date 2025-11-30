# step-security/git-tag-action [![Actions Status: test](https://github.com/step-security/git-tag-action/workflows/test/badge.svg)](https://github.com/step-security/git-tag-action/actions?query=workflow%3A"test")

This action do `git tag ${version}` to the repository, but it is idempotent. 

- Push the tag if the tag does not exist on the repository

## Usage

You create workflow file like `.github/workflows/publish.yml`.

```yml
name: publish
env:
  CI: true
on:
  push:
    branches:
      - master
    tags:
      - "!*"
jobs:
  release:
    name: Setup
    runs-on: ubuntu-latest
    steps:
      - name: checkout
        uses: actions/checkout@v6
      - name: setup Node
        uses: actions/setup-node@v6
      - name: package-version-to-git-tag
        uses: step-security/git-tag-action@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          github_repo: ${{ github.repository }}
          git_commit_sha: ${{ github.sha }}
          version: "1.0.0"
          git_tag_prefix: "v"
```

## UseCase

1. [Manual] Update Version: `npm --no-git-tag-version version {patch,minor,major}`
2. [Manual] Push: `git push --tags` or Merge the Pull Request
3. [CI] Publish to npm and Push a tag to GitHub  

This Release flow can be defined in `.github/workflows/publish.yml`

```yaml
name: publish
env:
  CI: true
on:
  push:
    branches:
      - master
    tags:
      - "!*"
jobs:
  release:
    name: Setup
    runs-on: ubuntu-latest
    steps:
      - name: checkout
        uses: actions/checkout@v6
      - name: setup Node
        uses: actions/setup-node@v6
        with:
          node-version: 14.x
          registry-url: 'https://npm.pkg.github.com'
      - name: install
        run: npm install
      - name: test
        run: npm test
      # Publish to npm if this version is not published
      - name: publish
        run: |
          npx can-npm-publish --verbose && npm publish || echo "Does not publish"
        env:
          NODE_AUTH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
      # Push tag to GitHub if package.json version's tag is not tagged
      - name: package-version
        run: node -p -e '`PACKAGE_VERSION=${require("./package.json").version}`' >> $GITHUB_ENV
      - name: package-version-to-git-tag
        uses: step-security/git-tag-action@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          github_repo: ${{ github.repository }}
          version: ${{ env.PACKAGE_VERSION }}
          git_commit_sha: ${{ github.sha }}
          git_tag_prefix: "v"
```

## Options

```yaml
inputs:
  version:
    description: 'Git Tag version'
    required: true
  github_token:
    description: 'use secrets.GITHUB_TOKEN'
    required: true
  git_commit_sha:
    description: 'Git commit SHA'
    required: false
  git_tag_prefix:
    description: "prefix for git tag. Example) 'v'"
    required: false
    default: ""
  github_repo:
    description: 'GitHub repository path'
    required: true
```

## FAQ

### Error: npm ERR! code E401

Occur following error:

```
npx: installed 57 in 6.945s
npm ERR! code E401
npm ERR! Unable to authenticate, need: Basic realm="GitHub Package Registry"

npm ERR! A complete log of this run can be found in:
npm ERR!     /github/home/.npm/_logs/2019-12-26T08_02_20_108Z-debug.log
```

Please check `NODE_AUTH_TOKEN`

```
  env:
    NODE_AUTH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```
