How to store API keys and secrets

1. Create a `.env` file in the project root (next to this repo's `package.json`).
   - Copy `.env.example` to `.env` and fill your keys.

2. The repository already ignores `.env` via `.gitignore`, so your secrets won't be committed.

3. Loading secrets in Python (example):

```python
from dotenv import load_dotenv
import os

load_dotenv()  # reads .env in project root
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')
```

4. Loading secrets in Node.js (example):

```js
// install dotenv in your Node environment: npm install dotenv
require('dotenv').config();
const openaiKey = process.env.OPENAI_API_KEY;
```

5. Quick verification: run the included `scripts/verify_env.py` to confirm the environment variable loads.

```bash
# Use the workspace Python command if configured
D:/python.exe scripts/verify_env.py
```

Security note: never store production secrets in the repository. Use environment variables, secret managers, or CI/CD secrets for deployments.