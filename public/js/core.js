// const svg = d3.select("svg");
// body의 SVG를 동적으로 설정
const body = d3.select("body");

const svg = body.append("svg")
    .attr("width", 500)
    .attr("height", 700)
    .attr("viewBox", "0 0 500 700")
    .attr("preserveAspectRatio", "xMidYMid meet");

// SVG 내부 요소 추가
svg.append("defs")
    .append("linearGradient")
    .attr("id", "gradient")
    .attr("x1", "0%")
    .attr("y1", "0%")
    .attr("x2", "100%")
    .attr("y2", "100%")
    .selectAll("stop")
    .data([
        { offset: "0%", color: "#ff007a", opacity: 1 },
        { offset: "100%", color: "#ff8c00", opacity: 1 }
    ])
    .join("stop")
    .attr("offset", d => d.offset)
    .style("stop-color", d => d.color)
    .style("stop-opacity", d => d.opacity);

const titleGroup = svg.append("g")
    .attr("class", "title-group")
    .attr("transform", `translate(${svg.attr("width") / 2}, 50)`); // SVG 가운데 정렬

// 왼쪽 테두리를 그리는 line 추가
titleGroup.append("line")
    .attr("class", "title-border")
    .attr("x1", -20) // 그룹 기준 왼쪽 위치
    .attr("y1", -15) // 테두리 시작점 (그룹 상단을 기준으로 약간 위로 이동)
    .attr("x2", -20) // 그룹 기준 왼쪽 위치 고정
    .attr("y2", 90) // 테두리 끝점 (그룹 하단까지)
    .attr("stroke", "#ff007a") // 테두리 색상
    .attr("stroke-width", 2); // 테두리 두께

// 서브타이틀 추가
titleGroup.append("text")
    .attr("class", "subtitle")
    .attr("x", 0) // 그룹 내 왼쪽 정렬
    .attr("y", 10)
    .text("2nd Week of December");

// 메인 타이틀 추가
titleGroup.append("text")
    .attr("class", "chart-title")
    .attr("x", 0) // 그룹 내 왼쪽 정렬
    .attr("y", 40)
    .text("Who's Weekly Top K-Pop Group?");

// 설명 텍스트 추가 (여러 줄)
const descriptionText = titleGroup.append("text")
    .attr("class", "description")
    .attr("x", 0) // 그룹 내 왼쪽 정렬
    .attr("y", 53);

const descriptionLines = [
    "This chart showcases this week’s top K-Pop groups,",
    "ranked by the YouTube views of their latest music videos,",
    "with counts recorded daily at 12:00 AM."
];

descriptionText.selectAll("tspan")
    .data(descriptionLines)
    .enter()
    .append("tspan")
    .attr("x", 0)
    .attr("dy", "1.0em") // 줄 간격
    .text(d => d);


function formatValue(value) {
    if (value >= 1e6) {
        return `${(value / 1e6).toFixed(1)}M`; 
    } else if (value >= 1e3) {
        return `${(value / 1e3).toFixed(1)}K`; 
    } else {
        return value.toString();
    }
}

async function loadData() {
    try{
        // config.js에서 설정 가져오기
        const configResponse = await fetch('/config');
        const config = await configResponse.json();
        
        // config에서 n과 duration 설정 값 가져오기
        const n = config.result_cnt || 8;  // 기본값 8
        const duration = config.duration || 2000;  // 기본값 2000ms

        const margin = {top: 80, right: 30, bottom: 50, left: 60};
        const width = +svg.attr("width") - margin.left - margin.right;
        const height = +svg.attr("height") - margin.top - margin.bottom;
        const barSize = 50;

        const x = d3.scaleLinear().range([margin.left, width - margin.right]);
        const y = d3.scaleBand()
            .range([margin.top + 70, margin.top + 80 + barSize * n * 1.2])
            .padding(0.3);

        const color = d3.scaleOrdinal(d3.schemeTableau10);

        // const dateLabel = svg.append("text")
        //     .attr("class", "date-label")
        //     .attr("x", width - 150)
        //     .attr("y", margin.top + 40)
        //     .attr("text-anchor", "end");

        // BigQuery에서 데이터 가져오기
        const dataResponse = await fetch('/bigquery-data');
        const data = await dataResponse.json();

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
            .attr("x", -20)
            .attr("y", -100)
            .on("error", function() {
                d3.select(this).attr("xlink:href", "sample_img/sample.png");
            });

        function updateBars([reg_date, data]) {
            console.log(`Date: ${reg_date}`);
            console.log("Top 8 data for this date:", data);
        
            // 스케일 및 트랜지션 설정
            x.domain([0, d3.max(data, d => d.cnt)]);
            y.domain(data.map(d => d.artistName));
            const transition = svg.transition().duration(duration).ease(d3.easeLinear);
        
            // 그룹 및 설정 배열
            const updateConfig = [
                {
                    group: barsGroup.selectAll("rect"),
                    enter: enter => enter.append("rect")
                        .attr("fill", d => color(d.artistName))
                        .attr("x", x(0) + 20)
                        .attr("y", d => y(d.artistName) + 20)
                        .attr("height", y.bandwidth() * 0.65)
                        .transition(transition)
                        .attr("width", d => x(d.cnt) - x(0)),
                    update: update => update
                        .transition(transition)
                        .attr("y", d => y(d.artistName) + 20)
                        .attr("width", d => x(d.cnt) - x(0)),
                    exit: exit => exit.remove()
                },
                {
                    group: labelGroup.selectAll("text"),
                    enter: enter => enter.append("text")
                        .attr("class", "label")
                        .attr("x", x(0) + 20) // 막대 시작 부분으로 고정
                        .attr("y", d => y(d.artistName) + 20 + y.bandwidth() / 3)
                        .attr("dy", "0.35em")
                        .text(d => d.artistName)
                        .transition(transition),
                    update: update => update
                        .transition(transition)
                        .attr("x", x(0) + 20) // 막대 시작 부분으로 고정
                        .attr("y", d => y(d.artistName) + 20 + y.bandwidth() / 3),
                    exit: exit => exit.remove()
                },
                {
                    group: valueGroup.selectAll("text"),
                    enter: enter => enter.append("text")
                        .attr("class", "value")
                        .attr("x", d => x(d.cnt) - 5)
                        .attr("y", d => y(d.artistName) + 20 + y.bandwidth() / 3)
                        .attr("dy", "0.35em")
                        .text(d => formatValue(d.cnt))
                        .transition(transition),
                    update: update => update
                        .transition(transition)
                        .attr("x", d => x(d.cnt) - 5)
                        .attr("y", d => y(d.artistName) + 20 + y.bandwidth() / 3)
                        .text(d => formatValue(d.cnt)),
                    exit: exit => exit.remove()
                },
                {
                    group: imgGroup.selectAll("image"),
                    enter: enter => enter.append("image")
                        .attr("class", "artist-img")
                        .attr("xlink:href", d => d.img_url)
                        .attr("x", x(0) - 45)
                        .attr("y", d => y(d.artistName) + 8)
                        .attr("preserveAspectRatio", "none")
                        .on("error", function() {
                            d3.select(this).attr("xlink:href", "sample_img/sample.png");
                        })
                        .transition(transition),
                    update: update => update
                        .transition(transition),
                    exit: exit => exit.remove()
                }
            ];
        
            // 공통 로직 처리
            updateConfig.forEach(({ group, enter, update, exit }) => {
                group.data(data, d => d.artistName).join(enter, update, exit);
            });
        
            // 상위 아티스트 이미지 업데이트
            if (data.length > 0) {
                const topArtist = data[0];
                topArtistImg.attr("xlink:href", topArtist.img_url);
            }
        
            // 날짜 라벨 업데이트
            // dateLabel.text(reg_date);
        
            // 기준선 및 레이블 업데이트
            const maxCnt = d3.max(data, d => d.cnt);
            const baselineValues = [maxCnt * 0.3, maxCnt * 0.6, maxCnt * 0.9];
        
            baselineGroup.selectAll("*").remove();
            baselineValues.forEach(baselineValue => {
                baselineGroup.append("line")
                    .attr("class", "baseline")
                    .attr("x1", x(baselineValue))
                    .attr("y1", margin.top + 85)
                    .attr("x2", x(baselineValue))
                    .attr("y2", height + margin.top -10);
        
                baselineGroup.append("text")
                    .attr("class", "baseline-label")
                    .attr("x", x(baselineValue) + 5)
                    .attr("y", margin.top + 75)
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

    } catch(erorr){
        console.error("Error loading data:", error);
    }
}

loadData();