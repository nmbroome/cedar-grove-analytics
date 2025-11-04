import { useEffect, useRef } from 'react';
import * as d3 from 'd3';

function TimeByClientChart({ data }) {
  const svgRef = useRef();

  useEffect(() => {
    if (!data || data.length === 0) return;

    // Clear previous chart
    d3.select(svgRef.current).selectAll('*').remove();

    const margin = { top: 20, right: 30, bottom: 80, left: 60 };
    const width = 700 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    const svg = d3.select(svgRef.current)
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Sort data by hours (descending)
    const sortedData = [...data].sort((a, b) => b.hours - a.hours);

    // Scales
    const x = d3.scaleBand()
      .domain(sortedData.map(d => d.client))
      .range([0, width])
      .padding(0.2);

    const y = d3.scaleLinear()
      .domain([0, d3.max(sortedData, d => d.hours)])
      .nice()
      .range([height, 0]);

    // Color scale - gradient from blue to purple
    const colorScale = d3.scaleSequential()
      .domain([0, sortedData.length - 1])
      .interpolator(d3.interpolateRgbBasis(['#3b82f6', '#8b5cf6', '#ec4899']));

    // Create bars
    svg.selectAll('.bar')
      .data(sortedData)
      .join('rect')
      .attr('class', 'bar')
      .attr('x', d => x(d.client))
      .attr('y', height)
      .attr('width', x.bandwidth())
      .attr('height', 0)
      .attr('fill', (d, i) => colorScale(i))
      .attr('rx', 4)
      .style('opacity', 0.8)
      .on('mouseover', function(event, d) {
        d3.select(this)
          .style('opacity', 1)
          .attr('transform', 'translateY(-3px)');
        
        // Show tooltip
        const tooltip = svg.append('g')
          .attr('class', 'tooltip-group');
        
        tooltip.append('rect')
          .attr('x', x(d.client) + x.bandwidth() / 2 - 60)
          .attr('y', y(d.hours) - 50)
          .attr('width', 120)
          .attr('height', 40)
          .attr('rx', 6)
          .attr('fill', '#1f2937')
          .style('opacity', 0.95);
        
        tooltip.append('text')
          .attr('x', x(d.client) + x.bandwidth() / 2)
          .attr('y', y(d.hours) - 35)
          .attr('text-anchor', 'middle')
          .attr('font-size', '12px')
          .attr('font-weight', 'bold')
          .attr('fill', 'white')
          .text(d.client);
        
        tooltip.append('text')
          .attr('x', x(d.client) + x.bandwidth() / 2)
          .attr('y', y(d.hours) - 20)
          .attr('text-anchor', 'middle')
          .attr('font-size', '14px')
          .attr('font-weight', 'bold')
          .attr('fill', '#60a5fa')
          .text(`${d.hours.toFixed(1)} hrs`);
      })
      .on('mouseout', function() {
        d3.select(this)
          .style('opacity', 0.8)
          .attr('transform', 'translateY(0)');
        
        svg.selectAll('.tooltip-group').remove();
      })
      .transition()
      .duration(800)
      .delay((d, i) => i * 50)
      .attr('y', d => y(d.hours))
      .attr('height', d => height - y(d.hours));

    // Add value labels on top of bars
    svg.selectAll('.label')
      .data(sortedData)
      .join('text')
      .attr('class', 'label')
      .attr('x', d => x(d.client) + x.bandwidth() / 2)
      .attr('y', height)
      .attr('text-anchor', 'middle')
      .attr('font-size', '11px')
      .attr('font-weight', '600')
      .attr('fill', '#374151')
      .style('opacity', 0)
      .transition()
      .duration(800)
      .delay((d, i) => i * 50 + 400)
      .attr('y', d => y(d.hours) - 5)
      .style('opacity', 1)
      .text(d => `${d.hours.toFixed(1)}h`);

    // X axis
    const xAxis = svg.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(x));

    xAxis.selectAll('text')
      .attr('transform', 'rotate(-45)')
      .style('text-anchor', 'end')
      .attr('dx', '-0.8em')
      .attr('dy', '0.15em')
      .attr('font-size', '11px')
      .attr('fill', '#4b5563');

    xAxis.select('.domain')
      .attr('stroke', '#d1d5db');

    xAxis.selectAll('.tick line')
      .attr('stroke', '#d1d5db');

    // Y axis
    const yAxis = svg.append('g')
      .call(d3.axisLeft(y).ticks(6).tickFormat(d => `${d}h`));

    yAxis.selectAll('text')
      .attr('font-size', '11px')
      .attr('fill', '#4b5563');

    yAxis.select('.domain')
      .attr('stroke', '#d1d5db');

    yAxis.selectAll('.tick line')
      .attr('stroke', '#e5e7eb');

    // Y axis label
    svg.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -height / 2)
      .attr('y', -45)
      .attr('text-anchor', 'middle')
      .attr('font-size', '12px')
      .attr('font-weight', '600')
      .attr('fill', '#6b7280')
      .text('Total Hours');

    // Add grid lines
    svg.selectAll('.grid-line')
      .data(y.ticks(6))
      .join('line')
      .attr('class', 'grid-line')
      .attr('x1', 0)
      .attr('x2', width)
      .attr('y1', d => y(d))
      .attr('y2', d => y(d))
      .attr('stroke', '#f3f4f6')
      .attr('stroke-dasharray', '3,3')
      .style('opacity', 0.5)
      .lower();

  }, [data]);

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="mb-4">
        <h3 className="text-xl font-semibold text-gray-800">Time by Client</h3>
        <p className="text-sm text-gray-600 mt-1">Total hours allocated per client</p>
      </div>
      <div className="overflow-x-auto">
        <svg ref={svgRef}></svg>
      </div>
      <div className="mt-4 flex items-center justify-center gap-2 text-xs text-gray-600">
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
        </svg>
        <span>Hover over bars for details</span>
      </div>
    </div>
  );
}

export default TimeByClientChart;