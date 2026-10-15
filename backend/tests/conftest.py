import os
import tempfile

# Keep test data in a temporary folder, never in backend/data.
# Runs before the tests import main and database, which read this when they load.
os.environ["DATA_DIRECTORY"] = tempfile.mkdtemp()
