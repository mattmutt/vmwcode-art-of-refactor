# Art of the Refactor
## Scoping the Problem Domain
The sample HTML and [D3 Javascript](https://d3js.org) help build a screen like the following that help visualize the problem set, grouped by our feature code modules.

![Treemap visualized](https://i.postimg.cc/bYgHngrp/treemap.png)

## Support
### Shell Scripts
Supplementary scripts used to collect and help with estimating

Change the following variables:

| Variable |  Description  |
|----------|:-------------|
| `SCAN_FOLDER_NAME` | folder of project code |
| `DEPRECATED_CODE`  | tag pattern to look for |
| `OUTPUT_LOG_PATH`  | output folder for CSV data file |


#### Scoping Count
Sum up all the occurrences

"vsc-translate-scoping.sh"
```
#!/bin/bash

## Change to your project
SCAN_FOLDER_NAME="<PROJECT>"

DEPRECATED_CODE="<TAG_REGEX_PATTERN>"
FILENAME_GLOB_MATCH="*.html"

HTML_I18N=`egrep "\b(${DEPRECATED_CODE})\b"  --include="${FILENAME_GLOB_MATCH}" -src  "${SCAN_FOLDER_NAME}" | sort | cut -d: -f2 | paste -sd+ - | bc`

echo "Deprecated '${DEPRECATED_CODE}' directive occurrences found in ${FILENAME_GLOB_MATCH} templates count: ${HTML_I18N}"
```

#### Generation of CSV file
Scoping breakdown by project

"generate-deprecated-i18n-usage-csv.sh"
```
#!/bin/bash

#input
## Change to your project
SCAN_FOLDER_NAME="<PROJECT>"

SCAN_FOLDER_NAMES=("${BASE_PROJECT_FOLDER}/src" "${BASE_PROJECT_FOLDER}/libs" )
DEPRECATED_CODE="<TAG_REGEX_PATTERN>"
FILENAME_GLOB_MATCH="*.html"


# output
OUTPUT_LOG_HEADERS=("path" "count" )
# web served folder for project
OUTPUT_LOG_CATEGORY="html"

### path to webapp folder for collecting data
OUTPUT_LOG_PATH="<CSV_OUTPUT_FOLDER>"


# generate headers for the sections to be scanned
outputGeneratedFile="${OUTPUT_LOG_PATH}/${OUTPUT_LOG_CATEGORY}-count.csv"
outputHeaderString=$(IFS=, ; echo "${OUTPUT_LOG_HEADERS[*]}")
echo "$outputHeaderString" > $outputGeneratedFile

# Will locate the HTML files containing and old tag name, for each section appending rows to the CSV
for folderName in "${SCAN_FOLDER_NAMES[@]}"
do
   # Generates a CSV-formatted file for the estimator web app to consume
   egrep ${DEPRECATED_CODE}  --include="${FILENAME_GLOB_MATCH}" -isrc  ${folderName} | grep -v ":0$" | sort | tr [:] [,] >> $outputGeneratedFile

done
```
