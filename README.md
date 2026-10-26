# VaultKey — Secure Offline Password Manager

A secure, offline, production-grade password manager written in Python. Now features a **modern B2B SaaS web interface** alongside the traditional command-line interface, storing all your encrypted credentials securely on your local machine.

## Features

- **Modern SaaS Dashboard**: Clean, production-grade flat UI with **Zero Gradients**, **Zero Shadows**, crisp 1px borders, and **Dark/Light Mode** support.
- **Recent Password Uses**: Fast-access strip tracking recent copy & view activity with instant 1-click clipboard actions.
- **1-Click Clipboard Copy**: One-click copy buttons for both Username and Password with instant visual feedback and toast confirmation.
- **Custom Fields**: Save anything else per entry (PIN, Secret Notes, Recovery Codes, API Keys, URLs) with optional secret masking.
- **High-Entropy Password Generator**: Built-in cryptographic generator with customizable length, symbols, and strength meter.
- **End-to-End Local Encryption**: Fernet (AES-128) encryption and Argon2id master password verification.
- **Robust Account Recovery**: Emergency recovery key allows restoring access if master password is forgotten.
- **Fully Offline**: Zero external network calls. All data resides solely in local encrypted JSON files.

## Launching the SaaS Web UI

To launch the modern SaaS dashboard, run:
```bash
python app.py
```
This automatically opens your default browser at `http://127.0.0.1:5432`.

---

## Setup Instructions

To get the password manager running, follow these steps to set up a virtual environment and install the required dependencies.

1.  **Navigate to the project directory**:
    ```bash
    cd Password_manager
    ```

2.  **Create a Python virtual environment**:
    ```bash
    python3 -m venv env
    ```
    This creates a new folder named `env` which will contain the project's dependencies.

3.  **Activate the virtual environment**:
    *   On macOS and Linux:
        ```bash
        source env/bin/activate
        ```
    *   On Windows:
        ```bash
        .\env\Scripts\activate
        ```
    You will know it's active when you see `(env)` at the beginning of your command prompt.

4.  **Install the dependencies**:
    ```bash
    pip install -r requirements.txt
    ```
    This command reads the `requirements.txt` file and installs all the necessary libraries (`questionary`, `argon2-cffi`, and `cryptography`).

## How to Use

### Windows Executable

For Windows users, a standalone executable `pmanager.exe` is available in the `dist` folder. You can download and run it directly without needing to install Python or set up a virtual environment.

[Download pmanager.exe](https://github.com/Uzee009/Local-Passwor-Manager/blob/main/dist/pmanager)

#### First-Time Setup

The first time you run the script, it will guide you through creating your vault.

```bash
python psmanger.py
```

1.  **Create Master Password**: You will be prompted to create a strong master password. This is the main key to your vault.
2.  **Save Your Recovery Key**: Immediately after, the application will display a **one-time recovery key**.
    - **THIS IS CRITICAL**: You must manually copy this key and save it in a new text file (`recoverykey.txt` or similar) in a secure, separate location (e.g., a different drive, an encrypted USB stick, or a cloud storage service).
    - This key is your only lifeline if you forget your master password. The application **will not** save it for you.

#### Normal Use

After the first run, running `python psmanger.py` will present you with the login screen.

1.  **Log In**: Choose the "Log In" option and enter your master password.
2.  **Main Menu**: Once unlocked, you can choose to:
    - **View Passwords**: Navigate through your categories and entries to view a decrypted password.
    - **Add New Password**: Add a new password entry to an existing or new category.
    - **Edit an Entry**: Select an existing entry to update its username or password.

#### Account Recovery

If you forget your master password:
1.  Run `python psmanger.py`.
2.  At the welcome screen, choose the **"Forgot Master Password"** option.
3.  The application will ask you to select the `recoverykey.txt` file that you saved during setup.
4.  If the key is correct, you will be prompted to set a new master password, and you will regain access to your vault.
