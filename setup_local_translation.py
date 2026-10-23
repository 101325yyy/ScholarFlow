"""Interactive setup: install OFFLINE en->zh Argos translation model.
Only package installation downloads from official Argos package index.
User's PDF files and abstracts are not uploaded.
"""
import subprocess
import sys

def main():
    try:
        import argostranslate.package as package
        import argostranslate.translate as translate
    except ImportError:
        print('Installing argostranslate Python package...')
        subprocess.check_call([sys.executable,'-m','pip','install','argostranslate'])
        import argostranslate.package as package
        import argostranslate.translate as translate
    print('Checking language model en -> zh ...')
    installed={p.from_code+'-'+p.to_code for p in package.get_installed_packages()}
    if 'en-zh' in installed:
        print('Already installed.');return
    print('Downloading Argos EN->ZH model; this step needs Internet ONCE. No PDFs are uploaded.')
    package.update_package_index()
    choices=[p for p in package.get_available_packages() if p.from_code=='en' and p.to_code=='zh']
    if not choices:
        raise SystemExit('Cannot find en -> zh language model in Argos package index. Please retry later.')
    path=choices[0].download()
    package.install_from_path(path)
    print('Installed. Local translation sample:')
    print(translate.translate('This study proposes a new mathematical model.','en','zh'))

if __name__=='__main__':main()
