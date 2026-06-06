interface Project {
  title: string
  description: string
  href?: string
  imgSrc?: string
}

const projectsData: Project[] = [
  {
    title: '搜索引擎',
    description: `如果你能查找世界上任何信息会怎样？网页、图片、视频等等。谷歌有许多功能帮助你找到你要找的内容。`,
    imgSrc: '/static/images/google.png',
    href: 'https://www.google.com',
  },
  {
    title: '时光机',
    description: `想象一下能够回到过去或前往未来。只需将旋钮转到所需日期并按下"出发"。有了这个简单又实惠的解决方案，你再也不用担心丢失钥匙或忘记耳机了。`,
    imgSrc: '/static/images/time-machine.jpg',
    href: '/blog/the-time-machine',
  },
]

export default projectsData
