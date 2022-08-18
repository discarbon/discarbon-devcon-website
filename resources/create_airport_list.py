''' Helper to transform the airports csv to a usable format'''

import csv
import pycountry

INPUT_FILE = "resources/airports.csv"

OUTPUT_FILE = "resources/airports_selected.js"


airports_selected = []
number_of_airports = 0

# opening the CSV file
with open(INPUT_FILE, mode='r')as input_file:

    # reading the CSV file
    csvFile = csv.reader(input_file)

    # displaying the contents of the CSV file
    for lines in csvFile:
        IATA_code = lines[13]
        scheduled_service = lines[11]
        size = lines[2]
        name = lines[3]
        municipality = lines[10]
        country = lines[8]
        latitude = lines[4]
        longitude = lines[5]



        # only airports with IATA codes, schedules services and of a certain size
        selector = IATA_code and \
                   scheduled_service == "yes" \
                   and (size == "medium_airport" or size == "large_airport")

        if selector:
            # Fix airports with empty municipalities (should work...)
            if not municipality:
                if name == "Hazrat Sultan International Airport":
                    municipality = "Turkistan"
                else:
                    delete_strings = ["Airport", "International", "(Antonio José de Sucre)", "Rajapaksa", "Xijiao"]
                    municipality = name
                    for element in delete_strings:
                        municipality = municipality.replace(element, "")
                    municipality = municipality.strip()
            # cleanup airport names of commas (otherwise website splits them wrongly)
            name = name.replace(',' , ' ')
            # convert country codes to human readable format
            if country == 'XK':  # Kosovo is not an official ISO code so needs to be treated specially
                country = 'Kosovo'
            else:
                country = pycountry.countries.get(alpha_2=lines[8]).name
            number_of_airports += 1
            airport_string = IATA_code + ", " + \
                             name + ", " + \
                             municipality + ", " + \
                             country
            airport_string = airport_string.replace(", , ", ", ") # replace empty elements

            airport_string = airport_string.replace('"', '\\"')
            airport_string = airport_string.strip()
            temp_airport = [airport_string,
                            latitude,
                            longitude]
            print(temp_airport)
            # if not municipality:
            #     print(airport_string)
            airports_selected.append(temp_airport)

# print(airports_selected)


airports_selected.sort(key=lambda x: x[0])

print("Airports selected: " + str(number_of_airports))

with open(OUTPUT_FILE, mode='w')as out_file:
    out_file.write('export const airports = [\n')
    for airport in airports_selected:
        out_file.write('["'+airport[0]+'"')
        out_file.write(', ' + airport[1])
        out_file.write(', ' + airport[2])
        out_file.write("]")
        if airport != airports_selected[-1]:  # don't add a comma to the last one
            out_file.write(",")
        out_file.write("\n")
    out_file.write('];\n')

# print (pycountry.countries.get(alpha_2='CH').name)
