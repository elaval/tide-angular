
"use strict";
/* jshint undef: true, unused: true */
/* global angular */
var tideElements = angular.module("tideElements", ["ui.bootstrap"]);


tideElements.directive("myDirective", function () {
 return {
  restrict: "A",
  transclude: true,
  template: "<div style='background-color:red' ng-transclude></div>",
};
});




tideElements.directive("tdColorLegend",["_", "d3",function (_, d3) {
 return {
  restrict: "A",
      //transclude: false,
      //template: "<div style='background-color:red' ng-transclude></div>",
      scope: {
        colorAttribute: "=tdColorAttribute",
        data: "=tdData",
      },
      
    link: function (scope, element, attrs) {
        var legendPlaceHolder = d3.select(element[0])
              .append("div")
              .attr("class", "row");

        var width = 200

        var render = function() {
          var colorScale = d3.scale.category10();

          // Asign colors according to alphabetical order to avoid inconsistency
          if (scope.colorAttribute) {
            var colorDomain = _.keys(_.groupBy(scope.data, function(d) {return d[scope.colorAttribute]})).sort();
            colorScale.domain(colorDomain);
          }

          //Remover Leyenda
          legendPlaceHolder.selectAll("div").remove();


          var legends = legendPlaceHolder.selectAll(".legends")
              .data(colorDomain)
              .enter()
                .append("div")
                .attr("class", "legends col-md-2")

          legends.append("div")
              .style("background", function(d) {return colorScale(d)})
              .style("width", "10px").style("height", "10px")
              .style("float", "left")
              .style("margin", "3px")


          legends.append("div")
              .text(function(d) {return d}) 
          }

          //render();
          scope.$watch("data", function (newVal, oldVal) {
            if (newVal) {
            }
            render();
          });   

          scope.$watch("colorAttribute", function (newVal, oldVal) {
            if (newVal) {
            }
            render();
          }); 
        
      }
    };
  }]);







tideElements.directive("tdXyChart",["_", "d3","tide.layout.xy","tide.utils.linearregression", "tide.utils.tooltip",function (_, d3, layout, regression, tooltip) {
 return {
  restrict: "A",
      //transclude: false,
      //template: "<div style='background-color:red' ng-transclude></div>",
      scope: {
        val: "=",
        data: "=tdData",
        tdXattribute: "=",
        tdYattribute: "=",
        tdIdAttribute: "=",
        tdFilter: "=",
        tdSqrScaleX: "= tdSqrScaleX",
        tdTooltipMessage: "=",
        highlight: "=tdHighlight",

        tdWidth: "=?",
        tdTrendline : "=?",

        // Bubble size
        maxSize : "=?tdMaxSize",
        minSize : "=?tdMinSize",
        sizeAttribute: "=?tdSizeAttribute",
        colorAttribute: "=?tdColorAttribute",

        tdSelected: "="
      },
      
      link: function (scope, element, attrs) {
        var width = scope.tdWidth ? scope.tdWidth : 300;
        var height = scope.tdWidth ? scope.tdWidth : 300;
        var margin = {};
        margin.left = 50;
        margin.right = 10;
        margin.top = 10;
        margin.bottom = 50;

        scope.colorAttribute = "genero";

        // Define dataPoints tooltip generator
        var dataPointTooltip = tooltip();
        if (scope.tdTooltipMessage) {
          dataPointTooltip.message(scope.tdTooltipMessage);
        } else {
          dataPointTooltip.message(function(d) {
            var msg = scope.tdXattribute + " : " + d[scope.tdXattribute];
            msg += "<br>" + scope.tdYattribute +  " : " + d[scope.tdYattribute];

            return  msg;
          });
        }

        // Define trendLine tooltip generator
        var trendlineTooltip = tooltip();
        trendlineTooltip.message(function(d) {
          var formatDecimal = d3.format(".2f");
          var formatDecimal4 = d3.format(".4f");

          var slopeMsg = d.slope > 0.01 ? formatDecimal(d.slope) : formatDecimal4(d.slope);
          var interceptMsg = d.intercept > 0.01 ? formatDecimal(d.intercept) : formatDecimal4(d.intercept);

          var msg = "y = "+slopeMsg+"*X +"+interceptMsg+"<br>";
          msg += "R2: "+formatDecimal(d.r2*100)+"%<br>";

          return  msg;
        });


        var svgContainer = d3.select(element[0])
          .append("svg")
          .attr("width", width+margin.left+margin.right)
          .attr("height", height+margin.top+margin.bottom)
          .append("g")
          .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        var svgXAxis = svgContainer.append("g")
        .attr("class", "x axis")
        .attr("transform","translate(0," + height + ")")
        .attr("stroke-width", "1.5px")
        ;
        var svgYAxis = svgContainer.append("g")
        .attr("class", "y axis");


        var svgXAxisText = svgXAxis
        .append("text")
        .attr("class", "label")
        .attr("x", width )
        .attr("y", -6)
        .style("text-anchor", "end")
        .text(scope.tdXattribute);

        var svgYAxisText = svgYAxis
        .append("text")
        .attr("class", "label")
        .attr("transform", "rotate(-90)")
        .attr("y", -30)
        .attr("dy", ".71em")
        .style("text-anchor", "end")
        .text(scope.tdYattribute);

        var trendLine = svgContainer.select(".trendline");

        var circles = svgContainer.selectAll("circle");

        scope.tdIdAttribute = scope.tdIdAttribute ? scope.tdIdAttribute : "id"


        var render = function(data) {

          if (data && data.length) {
            scope.maxSize = scope.maxSize ? scope.maxSize : 5;
            scope.minSize = scope.minSize ? scope.minSize : 1;

            // sizeScale - defines the size fo each bubble
            var sizeScale=d3.scale.linear().range([scope.minSize, scope.maxSize]);
            if (scope.sizeAttribute) {
              sizeScale.domain(d3.extent(data, function(d) {return +d[scope.sizeAttribute];}));
            } else {
              sizeScale.domain([1,1]).range([scope.maxSize, scope.maxSize]);
            }            

            layout
            .size([width, height])
            .xAttribute(scope.tdXattribute)
            .yAttribute(scope.tdYattribute)
            .sizeAttribute(scope.sizeAttribute)
            .useLog(scope.tdSqrScaleX)
            .sizeScale(sizeScale);


            var nodes = layout.nodes(data);


            var xAxis = d3.svg.axis().scale(layout.xScale()).ticks(7).tickFormat(d3.format("d")).tickSubdivide(0);
            var yAxis = d3.svg.axis().scale(layout.yScale()).orient("left").ticks(7).tickFormat(d3.format("d")).tickSubdivide(0);
            var colorScale = d3.scale.category10();

            // Asign colors according to alphabetical order to avoid inconsistency
            if (scope.colorAttribute) {
              var colorDimension = _.keys(_.groupBy(data, function(d) {return d[scope.colorAttribute]})).sort();
              colorScale.domain(colorDimension);
            }


            svgXAxis    
              .call(xAxis);

            svgXAxis.selectAll("path, line")
              .attr("fill","none")
              .attr("stroke", "black");

            svgYAxis
            .call(yAxis);

            svgYAxis.selectAll("path, line")
              .attr("fill","none")
              .attr("stroke", "black");

            circles = svgContainer.selectAll("circle")
            .data(nodes, function(d) {return d[scope.tdIdAttribute ? scope.tdIdAttribute : "id"];});

            circles.exit()
              .transition()
              .attr("r",0)
              .remove();

            circles.enter()
              .append("circle")
              .on("click", function(d) {
                scope.$apply(function(){
                  scope.highlight = d[scope.tdIdAttribute];
                });
                scope.tdSelected = d;
              })              
              .on("mouseenter", function(d) {
                dataPointTooltip.show(d);
              })
              .on("mouseleave", function() {
                dataPointTooltip.hide();
              });
              

            circles
            .sort(function(a, b) {return a.id == scope.highlight? 1 : b.id == scope.highlight ? -1 : 0})
            .transition()
            .attr("cx", function(d) {
              return d.x;
            })
            .attr("cy", function(d) {
              return d.y;
            })
            .attr("r", function(d) {
              return d.id == scope.highlight ? 2*d.r : d.r
            })
            .attr("stroke-width", function(d) {
              return (d.id == scope.highlight) ? 2 : 1;
            })
            .attr("fill", function(d) {
              return colorScale(d[scope.colorAttribute])
            })
            .attr("stroke", function(d) { return d3.rgb(colorScale(d[scope.colorAttribute])).darker(2); });

 

            

            svgXAxisText
              .text(scope.tdXattribute);


            // Trend Line - Linear Regression
            var datapoints = _.map(nodes, function(d) {return [+d[scope.tdXattribute], +d[scope.tdYattribute]];});
            var regObject = regression(datapoints);



           var line = d3.svg.line()
                .interpolate("basis");


          //Redraw trendline to place it on top of datapoints
          trendLine.remove();

          if (scope.tdTrendline) {
            trendLine = svgContainer
              .append("path")
                .datum(regObject)
                .attr("class", "trendLine")
                .attr("stroke", "red")
                .attr("stroke-width", 4)
                .attr("fill", "none")

                .attr("d", function(d) {
                  var trendlinePoints = _.map(d.points, function(d) {return [layout.xScale()(d[0]), layout.yScale()(d[1])];});
                  trendlinePoints = _.sortBy(trendlinePoints, function(d) {return d[0];});
                  return line(trendlinePoints);
                })
                .on("mouseenter", function(d) {
                  trendlineTooltip.show(d);
                })
                .on("mouseleave", function() {
                  trendlineTooltip.hide();
                });
          }




          }


        };

        scope.$watch("val", function (newVal, oldVal) {
          // clear the elements inside of the directive
          circles.attr("r", newVal);
        });

        scope.$watch("tdFilter", function (newVal, oldVal) {
          var filteredData = _.filter(scope.data, function(d) {return d.nom_unidad_academ == newVal.unidad;});
          render(filteredData);
        });


        scope.$watch("data", function (newVal, oldVal) {
          render(newVal);


        });      

        scope.$watch("tdSqrScaleX", function () {
          render(scope.data);
        });

        scope.$watch("highlight", function () {
          render(scope.data);
        });


      }
      
      
    };
  }]);


tideElements.factory("tide.layout.xy", ["d3","_", function(d3,_) {
  var layout = {};
  var xAttribute = null;
  var yAttribute = null;
  var sizeAttribute = null;
  var size = [200,200];
  var xScale = null;
  var yScale = null;
  var sizeScale = d3.scale.linear().domain([1,1]).range([2,2]);
  var useLog = false;

      /**
      * Calculates coordinates (x, dy, basey) for a group of area charts that can be stacked
      * each area chart is associated to a category in the data objects
      */
      layout.nodes = function(data) {

        var width = size[0];
        var height = size[1];

        if (true) {
          if (useLog) {
            xScale = d3.scale.pow().exponent(0.5).domain(d3.extent(data, function(d) {return +d[xAttribute];})).range([0,width]);
          } else {
            xScale = d3.scale.linear().domain(d3.extent(data, function(d) {return +d[xAttribute];})).range([0,width]);
          }
        }

        if (true) {
          yScale = d3.scale.linear().domain(d3.extent(data, function(d) {return +d[yAttribute];})).range([height,0]);
        }

        _.each(data, function(d) {
          d.x = xScale(d[xAttribute]);
          d.y = yScale(d[yAttribute]);
          d.r = sizeScale(d[sizeAttribute] ? d[sizeAttribute] : 1);
        }); 


        return data;
      };

      layout.size = function(_) {
        if (!arguments.length) return size;
        size = _;
        return layout;
      };
      // Consulta o modifica el atributa utilizado para la medida en el histograma
      layout.xAttribute = function(_) {
        if(!arguments.length) return xAttribute;
        xAttribute = _;
        return layout;
      };

      // Consulta o modifica el atributa utilizado para la categoría que agrupa distintos mantos
      layout.yAttribute = function(_) {
        if(!arguments.length) return yAttribute;
        yAttribute = _;
        return layout;
      };

      layout.sizeAttribute = function(_) {
        if(!arguments.length) return sizeAttribute;
        sizeAttribute = _;
        return layout;
      };


      // Gets or modifies xScale
      layout.xScale = function(_) {
        if(!arguments.length) return xScale;
        xScale = _;
        return layout;
      };

      // Gets or modifies yScale
      layout.yScale = function(_) {
        if(!arguments.length) return yScale;
        yScale = _;
        return layout;
      };

      // Gets or modifies yScale
      layout.sizeScale = function(_) {
        if(!arguments.length) return sizeScale;
        sizeScale = _;
        return layout;
      };

      // Gets or modifies flag for use of logaritmith scale in x axis
      layout.useLog = function(_) {
        if(!arguments.length) return useLog;
        useLog = _;
        return layout;
      };

      // Gets or sets size (r) for each node
      layout.rSize = function(_) {
        if(!arguments.length) return rSize;
        rSize = _;
        return layout;
      };

      return layout;
    }]);


tideElements.factory("tide.utils.linearregression", ["_",function(_) {
  // Calculates linear regresion on a set of data points: [[x1,y1], [x2,y2], ... [xn,yn]]
  // Returns object {slope: slope, intercept:intercept, r2: r2}

  var lr = function(data) {
    var sumX = 0;
    var sumY = 0;
    var sumX2 = 0;
    var sumY2 = 0;
    var sumXY = 0;
    var n = data.length;

    _.each(data, function(d) {
      sumX += d[0];
      sumY += d[1];
      sumX2 += d[0]*d[0];
      sumY2 += d[1]*d[1];
      sumXY += d[0]*d[1];
    });

    var slope = (n*sumXY-sumX*sumY)/(n*sumX2-sumX*sumX);
    var intercept = (sumY-slope*sumX)/n;
    var r2 = Math.pow((n*sumXY-sumX*sumY)/Math.sqrt((n*sumX2-sumX*sumX)*(n*sumY2-sumY*sumY)),2);
    var points = [];

    _.each(data, function(d) {
      var x = d[0];
      var y = d[0]*slope + intercept;
      points.push([x,y]);
    });


    return {"slope":slope, "intercept":intercept, "r2": r2, "points":points};
  };

  return lr;

}]);

/*
* tide.utils.tooltip
* Generador de Tooltip
* 
* Use:
* example.directive("myDirective",["tide.utils.tooltip",function (tooltip) {
*   var myTooltip = tooltip();
*   mytooTip.message(function(d) {
*     var msg = "Name: " + d.name;
*     return msg;
*   })
*
*   (...)
*   d3selection 
*     .on("mouseenter", function(d) {
*       mytooTip.show(d);
*     })
*     .on("mouseleave", function() {
*       mytooTip.hide();
*     });
*/
tideElements.factory("tide.utils.tooltip", ["d3",function(d3) {
  return function() {
      var tooltip = {};

      var message = function(d) {
        var id = d.id ? d.id : "noid";
        var msg = "<strong>ID: "+id +"</strong>";
        return msg;
      };


      tooltip.element = d3.select("body")
      .append("div")
      .attr("style", "background:#ffff99;width:350px;position:absolute;z-index:9999;border-radius: 8px;opacity:0.9;")
      .attr("class", "tooltipcontent")
      .style("visibility", "hidden");

      tooltip.content = tooltip.element
      .append("div")
      .attr("style", "padding:4px;");

      var tooltipPosition= function(mouseX, mouseY) {
        var windowH = window.innerHeight;
        var windowW = window.innerWidth;
        var scrollH = window.pageYOffset;
        var offsetV = window.document.body.offsetLeft;
        var tooltipH = tooltip.element[0][0].offsetHeight;
        var tooltipW = tooltip.element[0][0].offsetWidth;

        var posX = mouseX > (windowW-tooltipW-offsetV) ? windowW-tooltipW-offsetV : mouseX+10;

        var posY = 0;

        if ((mouseY+tooltipH-scrollH) < windowH) {
          posY = mouseY + 10;
        } else {
          posY = windowH-tooltipH+scrollH-10;
          posX = posX<(windowW-tooltipW-offsetV) ? posX : mouseX-tooltipW -10;
        }

        return {x:posX, y:posY};
      };

      tooltip.show = function(d) {
        var bodyLeft = document.body.getBoundingClientRect().left;

        var pos = {x:d3.event.pageX-bodyLeft, y:d3.event.pageY};

        var newpos = tooltipPosition(pos.x, pos.y);

        tooltip.element
        .style("top", newpos.y+"px")   
        .style("left", newpos.x+"px") 
        .style("visibility", "visible") 
        .html(message(d));      
      };

      tooltip.hide =  function() {
        tooltip.element
        .style("visibility", "hidden");
      };

    // Gets or modifies xScale
    tooltip.message = function(_) {
      if(!arguments.length) return message;
      message = _;
      return tooltip;
    };

    return tooltip;
  };

}]);

angular.module("underscore", [])
  .factory("_", function() {
    return window._; // assumes underscore has already been loaded on the page
});


angular.module("d3service", [])
  .factory("d3", [function(){
    var d3;

    d3 = window.d3;
    return d3;
}]);
 


