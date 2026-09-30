# Local entry points; each target runs the matching npm script.
.PHONY: install dev lint typecheck collect-data validate-data test-unit test-acceptance build build-stats validate-release

install:
	npm ci

dev:
	npm run dev

lint:
	npm run lint

typecheck:
	npm run typecheck

collect-data:
	npm run collect-data

validate-data:
	npm run validate-data

test-unit:
	npm run test-unit

test-acceptance:
	npm run test-acceptance

build:
	npm run build

build-stats:
	npm run build-stats

validate-release:
	npm run validate-release
