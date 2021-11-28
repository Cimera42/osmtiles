import os

def run():
    path_dir = os.path.dirname(__file__)
    with open(f'{path_dir}/dcsnsw.conf') as file_:
        return file_.read()
