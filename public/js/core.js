const svg = d3.select("svg");
const margin = {top: 80, right: 30, bottom: 50, left: 60};
const width = +svg.attr("width") - margin.left - margin.right;
const height = +svg.attr("height") - margin.top - margin.bottom;
const barSize = 50;
const n = 8; // 최대 표시할 아티스트 수
const duration = 1500;

const x = d3.scaleLinear().range([margin.left, width - margin.right]);
const y = d3.scaleBand()
    .range([margin.top + 70, margin.top + 100 + barSize * n * 1.2])
    .padding(0.3);

const color = d3.scaleOrdinal(d3.schemeTableau10);

const dateLabel = svg.append("text")
    .attr("class", "date-label")
    .attr("x", width - 150)
    .attr("y", margin.top + 40)
    .attr("text-anchor", "end");

function formatValue(value) {
    if (value >= 1e6) {
        return `${(value / 1e6).toFixed(1)}M`; 
    } else if (value >= 1e3) {
        return `${(value / 1e3).toFixed(1)}K`; 
    } else {
        return value.toString();
    }
}

// BigQuery에서 데이터 가져오기
fetch('/bigquery-data') 
    .then(response => response.json())
    .then(data => {
        data.forEach(d => {
            d.view_count = +d.view_count;

            let regDateString;
            if (typeof d.reg_date === 'object' && 'value' in d.reg_date) {
                regDateString = d.reg_date.value;
            } else if (typeof d.reg_date === 'string') {
                regDateString = d.reg_date;
            } else {
                console.error("Unknown reg_date format:", d.reg_date);
                return;
            }

            const formattedDate = regDateString.replace('T', ' ');
            d.reg_date = new Date(formattedDate);

            if (isNaN(d.reg_date)) {
                console.error("Invalid date format:", d.reg_date);
            }
        });

        // 날짜별로 데이터 그룹화
        const groupedData = d3.group(data, d => d3.timeFormat("%Y-%m-%d")(d.reg_date));

        // 각 날짜별 view_count 누적
        const cumulativeData = [];
        let cumulativeCounts = {};
        let lastValidData = new Map(); // 이전 데이터 저장

        groupedData.forEach((dataForDate, reg_date) => {

            // 기존 데이터가 없으면 이전 날짜의 데이터를 사용
            if (dataForDate.length === 0 && lastValidData.size > 0) {
                dataForDate = Array.from(lastValidData.values());
            }

            let current = dataForDate
                .map(d => ({
                    artistName: d.artistName,
                    cnt: d.view_count,
                    img_url: d.img_url
                }))
                .sort((a, b) => d3.descending(a.cnt, b.cnt))
                .slice(0, n);

            // 누적 계산
            current.forEach(d => {
                if (!cumulativeCounts[d.artistName]) {
                    cumulativeCounts[d.artistName] = 0;
                }
                cumulativeCounts[d.artistName] += d.cnt;
                lastValidData.set(d.artistName, d); // 현재 데이터를 저장
            });

            // 누적된 데이터 추가
            cumulativeData.push([reg_date, Object.entries(cumulativeCounts).map(([artistName, cnt]) => ({
                artistName,
                cnt,
                img_url: lastValidData.get(artistName)?.img_url || ""
            }))]);
        });


        const keyframes = cumulativeData.map(([reg_date, data]) => [reg_date, data.sort((a, b) => d3.descending(a.cnt, b.cnt)).slice(0, n)]);

        const baselineGroup = svg.append("g");
        const barsGroup = svg.append("g");
        const labelGroup = svg.append("g");
        const valueGroup = svg.append("g");
        const imgGroup = svg.append("g");

        const topArtistImgGroup = svg.append("g")
            .attr("transform", `translate(${width - 80}, ${height + margin.top - 70})`);

        const topArtistImg = topArtistImgGroup.append("image")
            .attr("class", "top-artist-img")
            .attr("x", -50)
            .attr("y", -100)
            .on("error", function() {
                d3.select(this).attr("xlink:href", "sample_img/sample.png");
            });

        function updateBars([reg_date, data]) {
            // 데이터가 올바르게 전달되는지 확인
            console.log(`Date: ${reg_date}`);
            console.log("Top 8 data for this date:", data);
        
            x.domain([0, d3.max(data, d => d.cnt)]);
            y.domain(data.map(d => d.artistName));
        
            const transition = svg.transition()
                .duration(duration)
                .ease(d3.easeLinear);
        
            const bars = barsGroup.selectAll("rect")
                .data(data, d => d.artistName)
                .join(
                    enter => enter.append("rect")
                        .attr("fill", d => color(d.artistName))
                        .attr("x", x(0) + 10)
                        .attr("y", d => y(d.artistName))
                        .attr("height", y.bandwidth())
                        .attr("width", 0),
                    update => update,
                    exit => exit.remove()
                )
                .transition(transition)
                .attr("y", d => y(d.artistName))
                .attr("width", d => x(d.cnt) - x(0));
        
            const labels = labelGroup.selectAll("text")
                .data(data, d => d.artistName)
                .join(
                    enter => enter.append("text")
                        .attr("class", "label")
                        .attr("x", d => x(d.cnt) - 5)
                        .attr("y", d => y(d.artistName) + y.bandwidth() / 3)
                        .attr("dy", "0.35em")
                        .text(d => `${d.artistName}`),
                    update => update,
                    exit => exit.remove()
                )
                .transition(transition)
                .attr("x", d => x(d.cnt) - 5)
                .attr("y", d => y(d.artistName) + y.bandwidth() / 3);
        
            const values = valueGroup.selectAll("text")
                .data(data, d => d.artistName)
                .join(
                    enter => enter.append("text")
                        .attr("class", "value")
                        .attr("x", d => x(d.cnt) - 5)
                        .attr("y", d => y(d.artistName) + y.bandwidth() * 2 / 3)
                        .attr("dy", "0.35em")
                        .text(d => formatValue(d.cnt)),
                    update => update,
                    exit => exit.remove()
                )
                .transition(transition)
                .attr("x", d => x(d.cnt) - 5)
                .attr("y", d => y(d.artistName) + y.bandwidth() * 2 / 3)
                .text(d => formatValue(d.cnt));
        
            const artistImgs = imgGroup.selectAll("image")
                .data(data, d => d.artistName)
                .join(
                    enter => enter.append("image")
                        .attr("class", "artist-img")
                        .attr("xlink:href", d => d.img_url)
                        .attr("x", x(0) - 45)
                        .attr("y", d => y(d.artistName))
                        .attr("width", 30)
                        .attr("height", 30)
                        .on("error", function() {
                            d3.select(this).attr("xlink:href", "sample_img/sample.png");
                        }),
                    update => update,
                    exit => exit.remove()
                )
                .transition(transition)
                .attr("y", d => y(d.artistName) + y.bandwidth() / 4);
        
            if (data.length > 0) {
                const topArtist = data[0];
                topArtistImg.attr("xlink:href", topArtist.img_url);
            }
        
            dateLabel.text(reg_date);
        
            const maxCnt = d3.max(data, d => d.cnt);
            const baselineValues = [
                maxCnt * 0.3,
                maxCnt * 0.6,
                maxCnt * 0.9
            ];
        
            baselineGroup.selectAll(".baseline").remove();
            baselineGroup.selectAll(".baseline-label").remove();
        
            baselineValues.forEach((baselineValue) => {
                baselineGroup.append("line")
                    .attr("class", "baseline")
                    .attr("x1", x(baselineValue))
                    .attr("y1", margin.top + 70)
                    .attr("x2", x(baselineValue))
                    .attr("y2", height + margin.top + 100 - 90);
        
                baselineGroup.append("text")
                    .attr("class", "baseline-label")
                    .attr("x", x(baselineValue) + 5)
                    .attr("y", margin.top + 60)
                    .text(formatValue(Math.round(baselineValue)))
                    .attr("dy", "0.35em");
            });
        }
        
        let idx = 0;
        function tick() {
            if (idx < keyframes.length) {
                updateBars(keyframes[idx]);
                idx += 1;
                setTimeout(tick, duration);
            }
        }

        tick();
    }).catch(error => {
        console.error('Error loading or processing the data:', error);
    });
