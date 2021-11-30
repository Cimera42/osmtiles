import os

def run():
    path_dir = os.path.dirname(__file__)
    with open(f'{path_dir}/osm.conf') as file_:
        return file_.read()
