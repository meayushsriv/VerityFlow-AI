PYTHON ?= python
.PHONY: data-check train evaluate model-smoke test test-go test-ml dev

data-check:
	$(PYTHON) ml/src/validate_data.py

train:
	$(PYTHON) ml/src/train.py

evaluate:
	$(PYTHON) ml/src/evaluate.py

model-smoke:
	$(PYTHON) ml/src/export_model.py

test: test-go test-ml

test-go:
	cd backend && go test ./...

test-ml:
	$(PYTHON) -m pytest ml/tests -q

dev:
	@echo "Start the API and frontend in separate terminals: cd backend; go run ./cmd/api  |  cd frontend; npm run dev"
