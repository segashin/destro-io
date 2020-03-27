import os
import sys
import pandas as pd
import json
import collections as cl

def convert2csv(in_fname, out_fname):
    filepath = os.path.join(os.getcwd(), in_fname)
    out_path = os.path.join(os.getcwd(), out_fname)
    read_file = pd.read_excel(filepath)
    read_file.to_csv(out_path, header=False, index=None)

def convert2json(in_fname, out_fname):
    in_path = os.path.join(os.getcwd(), in_fname)
    df = pd.read_excel(in_path)
    out_path = os.path.join(os.getcwd(), out_fname)

    ys = cl.OrderedDict()

    for i in range(df.shape[0]):
        for j in range(df.shape[1]):
            val = df.iloc[i,j]
            if val == 0:
                continue
            
            data = cl.OrderedDict()
            #shape = 1: first quadrant, 2: second quadrant, 3: third quadrant, 4,: forth quadrant
            if val == 1:
                data["type"] = "wall"
                data["passable"] = False
                data["shape"] = 0
            elif val == 2:
                data["type"] = "bush"
                data["passable"] = True
                data["shape"] = 0
            elif val == 3:
                data["type"] = "water"
                data["passable"] = True
                data["shape"] = 0
            elif val == 4:
                data["type"] = "gray_zone"
                data["passable"] = True
                data["shape"] = 0
            elif val == 11:
                data["type"] = "wall"
                data["passable"] = False
                data["shape"] = 1
            elif val == 12:
                data["type"] = "wall"
                data["passable"] = False
                data["shape"] = 2
            elif val == 13:
                data["type"] = "wall"
                data["passable"] = False
                data["shape"] = 3
            elif val == 14:
                data["type"] = "wall"
                data["passable"] = False
                data["shape"] = 4
            elif val == 100:
                data["type"] = "core"
                data["passable"] = False
                data["shape"] = 0
                data["team"] = 0
            elif val == 101:
                data["type"] = "core"
                data["passable"] = False
                data["shape"] = 0
                data["team"] = 1
            else:
                print("unkown value error")
                return
            

            data["x"] = j
            data["y"] = i
            id = j+i*df.shape[1]
            ys[id] = data

    fw = open(out_path, 'w')
    json.dump(ys,fw,indent=4)



if __name__=='__main__':
    convert2json(sys.argv[1], sys.argv[2])
#convert(sys.argv[1])
