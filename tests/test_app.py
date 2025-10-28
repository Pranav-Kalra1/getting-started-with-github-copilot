import copy
from urllib.parse import quote

import pytest
from fastapi.testclient import TestClient

from src import app as app_module


client = TestClient(app_module.app)
original_activities = copy.deepcopy(app_module.activities)


@pytest.fixture(autouse=True)
def reset_activities():
    # Reset the in-memory activities before each test to keep tests isolated
    app_module.activities.clear()
    app_module.activities.update(copy.deepcopy(original_activities))
    yield


def test_get_activities():
    r = client.get("/activities")
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, dict)
    assert "Chess Club" in data


def test_signup_and_unregister_flow():
    activity = "Chess Club"
    email = "teststudent@example.com"
    # ensure not present before signup
    assert email not in app_module.activities[activity]["participants"]

    # signup
    path = f"/activities/{quote(activity)}"
    r = client.post(f"{path}/signup?email={quote(email)}")
    assert r.status_code == 200
    assert "Signed up" in r.json().get("message", "")

    # verify present
    r2 = client.get("/activities")
    assert r2.status_code == 200
    data = r2.json()
    assert email in data[activity]["participants"]

    # duplicate signup should return 400
    r3 = client.post(f"{path}/signup?email={quote(email)}")
    assert r3.status_code == 400

    # unregister
    r4 = client.post(f"{path}/unregister?email={quote(email)}")
    assert r4.status_code == 200
    # verify removed
    assert email not in app_module.activities[activity]["participants"]


def test_unregister_nonexistent():
    activity = "Chess Club"
    email = "nonexistent@example.com"
    path = f"/activities/{quote(activity)}"
    r = client.post(f"{path}/unregister?email={quote(email)}")
    assert r.status_code == 404
