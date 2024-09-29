APP = app.py
VENV = venv
HOST = 127.0.0.1
PORT = 3000

all: run

$(VENV)/bin/activate:
	python3 -m venv $(VENV)

install: $(VENV)/bin/activate requirements.txt
	$(VENV)/bin/pip install -r requirements.txt

run: $(VENV)/bin/activate
	FLASK_APP=$(APP) FLASK_ENV=development $(VENV)/bin/flask run --host=$(HOST) --port=$(PORT)

clean:
	rm -rf $(VENV)

requirements.txt:
	$(VENV)/bin/pip freeze > requirements.txt

.PHONY: all install run clean