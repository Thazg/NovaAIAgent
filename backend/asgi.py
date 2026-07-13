import os
import sys

# Ensure backend directory is in path
sys.path.insert(0, os.path.dirname(__file__))

from app import app

# PythonAnywhere looks for 'application' by default
application = app
