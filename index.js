const axios = require('axios').default
const config = require('./config')

if(!config.authorization && !config.sso){
  throw Error('缺少用户配置[authorization]和[sso]')
}

if(!config.commentText){
  throw Error('缺少评论字段[commentText]')
}

if(!config.learnCourseId){
  throw Error('缺少课程id[learnCourseId]')
}


function getRequestHeader() {
  return {
    Authorization: config.authorization,
    'Authorization-Sso': config.sso
  }
}

function delay(second) {
  return new Promise(resolve => setTimeout(resolve, second * 1000))
}

function getFullCourseSectionList(){
  return new Promise(async (resolve, reject)=> {
    try {
      let sections = []
      let page = 1
      let sectionPullNotReady = true


      const listResp = await getCourseSectionList(config.learnCourseId,page)
      const sectionList = listResp.data.data
      sections = sections.concat(sectionList)
      page++ 
      while (sectionPullNotReady) {
        const _listResp = await getCourseSectionList(config.learnCourseId, page)
        const _sectionList = _listResp.data.data
        sections =sections.concat(_sectionList)
        if(_sectionList.length <= 0){
          sectionPullNotReady = false
        }
        page++ 
        await delay(1)
      }

      resolve(sections)
    } catch (error) {
      console.error(error)
      reject(error)
    }
  })
}

/**
 * 拉取某个课程的章节列表
 * @param {*} id 课程id
 */
function getCourseSectionList(id, page =1 ) {
  const jsonData = `{"search":{"order":{"sort":"asc"},"sort":0,"course_id":"${id}"}}`

  return axios.get(`https://wap-api.xplus.xiaodengta.com/zaker/CourseSection?jsonData=${jsonData}&page=${page}&pageCount=20`, {
    headers: getRequestHeader()
  })
}


/**
 * 拉取某个课程的章节详情
 * @param {*} id 课程id
 */
function getCourseSection(sectionId) {
  return axios.get(`https://wap-api.xplus.xiaodengta.com/zaker/CourseSection/${sectionId}/edit`, {
    headers: getRequestHeader()
  })
}

function sectionSign(sectionId, content) {
  return axios.post(`https://wap-api.xplus.xiaodengta.com/zaker/CourseSection/CourseSectionCard/setCourseSectionCard`, {
    course_section_id: sectionId, 
    card_content: content, 
    type: 0, 
    array_file_id: []
  }, {
    headers: getRequestHeader()
  })
}

function sectionMp3(fileUrl) {
  return axios.get(fileUrl,{
    headers: getRequestHeader()
  })
}

/**
 * 分析已学习和未学习
 * @param {*} sectionList 
 */
function analysisCourseSection(sectionList) {
  const finish = []
  const ready = []
  sectionList.forEach(section => {
    const { isPunchCard } = section.statusInfo
    if (isPunchCard === 1) {
      // 已解锁（已学习）
      // finish.splice(0,0,section)
      finish.push(section)
    } else {
      // 未解锁（未学习）
      // ready.splice(0,0,section)
      ready.push(section)
    }
  })


  console.log(`【已学习】：${finish.length}`)
  finish.forEach(item => {
    console.log(`${item.title}`)
  });

  console.log(`【未学习】：${ready.length}`)
  ready.forEach(item => {
    console.log(`${item.title}`)
  });


  return { ready, finish }
}

/**
 * 找出下一个学习的章节
 * @param {*} sectionList 章节列表
 */
function findNextSection(sectionList) {
  return sectionList.find((section) => {
    const { isUnlock, isPunchCard } = section.statusInfo
    if (isUnlock === 1 && isPunchCard === 0) {
      return true
    } else {
      return false
    }
  })
}

function learning(section) {
  return new Promise(async (resolve, reject) => {
    try {
      const sectionResp = await getCourseSection(section.courseSectionId)
      const sectionInfo = sectionResp.data.data
      console.log(`📖 章节： ${sectionInfo.title}， 时长：${sectionInfo.av.durationDesc}`)

      const duration = sectionInfo.av.durationDesc
      const mp3Url = sectionInfo.av.url
      const min = Number(duration.split('分')[0])
      await sectionMp3(mp3Url)
      console.log(`⏱ 等待 ${min} 分钟`)
      // await delay((min+1)*60)
      await delay(600)

      await sectionSign(section.courseSectionId, config.commentText)
      console.log(`🚀 打卡完成`)
      resolve()
    } catch (error) {
      console.error(error)
      reject(error)
    }
  })
}

async function startLearn(sectionList) {
  analysisCourseSection(sectionList)
  const nextSection = findNextSection(sectionList)
  if (nextSection) {
    await learning(nextSection)
    const sectionList = await getFullCourseSectionList(config.learnCourseId)
    startLearn(sectionList)
  } else {
    return
  }
}

async function main() {
  const sectionList = await getFullCourseSectionList(config.learnCourseId)
  // analysisCourseSection(sectionList)
  startLearn(sectionList)
}

main()