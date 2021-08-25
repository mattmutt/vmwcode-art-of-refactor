// definitions of concepts
const config = {
   dataSourceURL: './data/html-count.csv',
   viewModel: {
      html: {
         label: "HTML Templates",
         filesAffectedCount: 0,
         totalOccurrencesCount: 0
      },
      cellLink: {
         // EXAMPLE: source code repository link ( change accordingly )
         basePath: "https://www.onelook.com/?w="
      }
   }
};

function render(targetSvgId, dataSource, model) {
   const svg = d3.select('svg#' + targetSvgId),
      width = +svg.attr('width'),
      height = +svg.attr('height');

   const color = d3.scaleOrdinal(d3.schemeCategory20);
   const format = d3.format(',d');
   const treemap = d3.treemap().size([width, height]).round(true).padding(1);
   const pathSeparator = "/";

   // organization. get path leading up to the filename
   function getLeadingPath(pathSpec) {
      return pathSpec.substring(0, pathSpec.lastIndexOf(pathSeparator));
   }

   function getBaseFilename(filePath) {
      const name = getFullFilename(filePath);
      return name.substring(0, name.lastIndexOf('.'));
   }

   function getFullFilename(filePath) {
      return filePath.substring(filePath.lastIndexOf(pathSeparator) + 1);
   }

   /* custom organization and parsing based on project structure rules */
   function getGroupIndex(data) {
      const groupAncestorList = data.ancestors();
      // prefer "libraries" to be treated special
      const isWorkspaceLib = groupAncestorList[groupAncestorList.length - 2].id.split(pathSeparator).pop() === 'libs';
      const offset = isWorkspaceLib ? 3 : 5;
      return groupAncestorList[groupAncestorList.length - offset].id;
   }

   d3.csv(
      dataSource,
      // remap each data item
      function (d) {
         d.size = +d.count; // extract CSV count numerically
         model.totalOccurrencesCount += d.size;
         model.filesAffectedCount++;
         return d;
      },
      function (error, data) {
         if (error) throw error;

         // add groups based on data
         const words = data
            .map((_) => _.path)
            .map((_) => _.substring(0, _.lastIndexOf(pathSeparator) + 1))
            .map((_) => _.split(pathSeparator));

         const expandedWords = [];

         // make lineage and ancestors
         words.forEach((pathSegmentList) => {
            pathSegmentList.forEach((segment, idx) => {
               const partialPathSerialized = pathSegmentList.slice(0, idx).join(pathSeparator);
               if (partialPathSerialized) {
                  expandedWords.push(partialPathSerialized);
               } else {
                  // error of some sort
               }
            });
         });

         // uniques
         const uniqWords = {};
         expandedWords.forEach((_) => (uniqWords[_] = true));

         const pathIdentifierList = Object.keys(uniqWords).sort();

         // just the parents
         pathIdentifierList.forEach((_) => data.unshift({path: _}));

         // make groupings of the files based upon a folder naming scheme, sort of
         const root = d3
            .stratify()
            .id(function (d) {
               return d.path;
            })
            .parentId(function (d) {
               return getLeadingPath(d.path);
            })(data)
            .sum(function (d) {
               return d.size;
            })
            .sort(function (a, b) {
               return b.height - a.height || b.value - a.value;
            });

         treemap(root);

         /////////////////////// ADD in Cushion TreeMap coloring /////////////////////////////

         // loop over all radial color groups
         const defs = svg
            .append("defs")
            .selectAll('a')
            .data(root.leaves())
            .enter()

         // should be reduced to eliminate repeated radialGradient entries!
         const radialGrad = defs.append('radialGradient')
            .attr('id', function (d) {
               return 'radial-gradient-' + getGroupIndex(d);
            })

            .attr("cx", "55%")
            .attr("cy", "35%")
            .attr("r", "100%");

         radialGrad
            .append("stop")
            .attr('offset', '0%')
            .attr('stop-color', '#ffffff')
            .attr('stop-opacity', .8)

         radialGrad
            .append("stop")
            .attr('offset', '100%')
            .attr('stop-color', '#ffffff')
            .attr('stop-opacity', 0)

         /////////////////////// ADD in Cushion TreeMap coloring /////////////////////////////


         const cell = svg
            .selectAll('a')
            .data(root.leaves())
            .enter()


            .append('a')
            .attr('target', '_blank')

            // EXAMPLE: make the an optional hyperlink to code base to show more details on the file
            .attr('xlink:href', function (d) {
               return `${config.viewModel.cellLink.basePath}/${encodeURIComponent(d.data.path)}`;
            })
            .attr('transform', function (d) {
               return 'translate(' + d.x0 + ',' + d.y0 + ')';
            });

         cell
            .append('rect')
            .attr('id', function (d) {
               return d.id;
            })
            .attr('width', function (d) {
               return d.x1 - d.x0;
            })
            .attr('height', function (d) {
               return d.y1 - d.y0;
            })
            .attr('fill', function (d) {
               return color(getGroupIndex(d));
            });

         /////////////////////// Support for Cushion TreeMap coloring /////////////////////////////
         cell
            .append('rect')
            .attr('id', function (d) {
               return d.id;
            })
            .attr('width', function (d) {
               return d.x1 - d.x0;
            })
            .attr('height', function (d) {
               return d.y1 - d.y0;
            })

            .attr('fill', function (d) {
               return 'url(#radial-gradient-' + getGroupIndex(d) + ')';
            });
         /////////////////////// Support for Cushion TreeMap coloring /////////////////////////////

         const textPadding = {
            x: 4,
            y: 12
         }

         cell
            .append('clipPath')
            .attr('id', function (d) {
               return 'clip-' + d.id;
            })
            .append('use')
            .attr('xlink:href', function (d) {
               return '#' + d.id;
            });

         const label = cell.append('text')
            .attr('y', textPadding.y)
            .attr('clip-path', function (d) {
               return 'url(#clip-' + d.id + ')';
            });

         // partial filename displayed in cell ( minus extension )
         label
            .append('tspan')
            .attr('x', textPadding.x)
            .attr('y', textPadding.y)
            .text(function (d) {
               return getBaseFilename(d.data.path);
            });


         /* centered count text */
         label
            .append('tspan')
            .attr('text-anchor', "middle")
            .attr('x', function (d) {
               return (d.x1 - d.x0) / 2;
            })
            .attr('y', function (d) {
               return (d.y1 - d.y0) / 2;
            })
            .text(function (d) {
               return format(d.value);
            });


         // tooltip
         cell.append('title').text(function (d) {
            const nl = '\n\n';
            const parentPath = d.parent ? d.parent.data.path : null
            const leadingPath = parentPath ? getLeadingPath(d.data.path) : null;
            const label = getGroupIndex(d).split(pathSeparator).pop();

            return [getFullFilename(d.data.path), format(d.value), leadingPath, label].filter(Boolean).join(nl);
         });

         // render back to HTML
         document.getElementById("htmlTypeDescriptor").textContent = model.label;
         document.getElementById("htmlFilesAffectedCount").textContent = model.filesAffectedCount;
         document.getElementById("htmlTotalOccurrencesCount").textContent = model.totalOccurrencesCount;

         // shown on tab
         document.getElementById("tab1ItemsCount").textContent = model.filesAffectedCount;

      }
   );

}

function changeTab(tabId) {
   const allTabIdList = ['1', '2'];

   allTabIdList
      .map((btnId) => document.getElementById('tab' + btnId))
      .forEach((elem) => {
            elem.classList.remove('active');
         }
      );

   allTabIdList
      .map((btnId) => document.getElementById('panel' + btnId))
      .forEach((elem) => {
            elem.classList.remove('active');
            elem.hidden = true;
         }
      );

   try {
      document.getElementById('tab' + tabId).classList.add('active');
      document.getElementById('panel' + tabId).classList.add('active');
      document.getElementById('panel' + tabId).hidden = false;
   } catch (e) {

   }
}

// initialize data tree with
function pageInit() {
   render("svg1", config.dataSourceURL, config.viewModel.html);
   changeTab("1");
}
