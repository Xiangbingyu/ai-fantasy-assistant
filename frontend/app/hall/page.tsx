// app/hall/page.tsx
'use client';
import { useState } from 'react';
import { World } from '../types/db';
import Navbar from './components/Navbar';
import FilterBar from './components/FilterBar';
import MyWorldsSidebar from './components/MyWorldsSidebar';
import WorldCard from './components/WorldCard';

// 示例数据（改为使用后端 World 结构）
const mockWorlds: World[] = [
    {
        id: 1,
        user_id: 1,
        name: '魔法大陆编年史',
        tags: ['#魔法', '#奇幻'],
        is_public: true,
        worldview: '一个充满魔法与神秘生物的奇幻世界，各个魔法派系之间的权力斗争正在上演...',
        master_setting: '大法师协会设定与权力结构',
        main_characters: [
            { name: '艾琳', background: '天赋异禀的女法师，追寻失落的魔法源泉' },
            { name: '罗兰', background: '王国骑士，忠于荣耀，内心矛盾重重' },
            { name: '西格尔', background: '游侠，通晓秘境传说与古文' }
        ],
        origin_world_id: null,
        create_time: '2023-11-01T08:00:00Z',
        popularity: 1254
    },
    {
        id: 2,
        user_id: 2,
        name: '星际殖民计划',
        tags: ['#科幻', '#太空'],
        is_public: true,
        worldview: '公元2145年，人类开始星际殖民，在遥远的阿尔法星系遇到了神秘的外星文明...',
        master_setting: '联合殖民委员会与飞船 AI 设定',
        main_characters: [
            { name: '凯伦', background: '殖民舰队指挥官，冷静理性' },
            { name: '阿尔法信使', background: '外星文明的中介，动机成谜' }
        ],
        origin_world_id: null,
        create_time: '2023-10-28T08:00:00Z',
        popularity: 987
    },
    {
        id: 3,
        user_id: 3,
        name: '长安风华录',
        tags: ['#古风', '#历史'],
        is_public: true,
        worldview: '梦回大唐长安，见证盛世繁华与暗流涌动，体验古代文人墨客的风雅生活...',
        master_setting: '长安府衙与市井文化设定',
        main_characters: [
            { name: '子安', background: '书生出身的巡官，恪守礼法' },
            { name: '如烟', background: '名伎，擅琴棋书画，暗藏机智' }
        ],
        origin_world_id: null,
        create_time: '2023-10-15T08:00:00Z',
        popularity: 1567
    },
    {
        id: 4,
        user_id: 1,
        name: '异能学院日记',
        tags: ['#校园', '#异能'],
        is_public: false,
        worldview: '一所特殊的高中，学生们都拥有不同的超能力，日常与非日常交织的校园生活...',
        master_setting: '学生会与异能等级设定',
        main_characters: [
            { name: '凌风', background: '高三学生，觉醒风系异能' },
            { name: '夏清', background: '学生会副会长，能力为心灵感应' }
        ],
        origin_world_id: null,
        create_time: '2023-10-10T08:00:00Z',
        popularity: 842
    },
    {
        id: 5,
        user_id: 2,
        name: '末世生存指南',
        tags: ['#末世', '#生存'],
        is_public: true,
        worldview: '丧尸病毒爆发后的世界，幸存者们如何在废墟中挣扎求生，重建文明...',
        master_setting: '避难所与资源配给设定',
        main_characters: [
            { name: '牧野', background: '前消防员，团队的守护者' },
            { name: '珊', background: '药剂师，擅长救治与配药' }
        ],
        origin_world_id: null,
        create_time: '2023-09-30T08:00:00Z',
        popularity: 1123
    },
    {
        id: 6,
        user_id: 3,
        name: '武侠江湖志',
        tags: ['#古风', '#武侠'],
        is_public: false,
        worldview: '一个快意恩仇的武侠世界，各大门派纷争不断，武林秘籍重现江湖...',
        master_setting: '门派谱系与江湖规矩设定',
        main_characters: [
            { name: '青迟', background: '剑客，练就快剑绝技' },
            { name: '顾行云', background: '医者游侠，济世救人' }
        ],
        origin_world_id: null,
        create_time: '2023-09-20T08:00:00Z',
        popularity: 756
    }
];

const tags = ['#魔法', '#末世', '#科幻', '#古风', '#校园', '#武侠', '#异能', '#历史', '#太空'];

// app/hall/page.tsx
export default function WorldHall() {
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState('热度');
    const [selectedTags, setSelectedTags] = useState<string[]>([]);

    // 筛选逻辑（基于 db.World）
    const filteredWorlds = mockWorlds
        .filter(world => {
            if (!world.is_public) return false;

            if (selectedTags.length > 0 && !selectedTags.some(tag => world.tags.includes(tag))) return false;

            if (searchQuery) {
                const query = searchQuery.toLowerCase();
                if (
                    !world.name.toLowerCase().includes(query) &&
                    !world.tags.some(tag => tag.toLowerCase().includes(query))
                ) {
                    return false;
                }
            }
            return true;
        })
        .sort((a, b) => {
            if (sortBy === '热度') {
                return b.popularity - a.popularity;
            } else if (sortBy === '更新时间') {
                // World 不再有 update_time，这里以 create_time 代替“最新”
                return new Date(b.create_time).getTime() - new Date(a.create_time).getTime();
            }
            return 0;
        });

    // 我的世界（私有或最近访问）
    // 这里假设当前用户ID为1，实际应用中应该从登录状态获取
    const currentUserId = 1;
    const myWorlds = mockWorlds
        .filter(world => world.user_id === currentUserId)
        .sort((a, b) => new Date(b.create_time).getTime() - new Date(a.create_time).getTime());

    // 进入创作
    const startCreation = (worldId: number) => {
        console.log(`进入世界创作: ${worldId}`);
        alert(`开始创作世界: ${mockWorlds.find(w => w.id === worldId)?.name}`);
    };

    return (
        <div className="min-h-screen flex flex-col">
            <Navbar
                title="幻境协创"
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
            />
            <FilterBar
                sortBy={sortBy}
                setSortBy={setSortBy}
                tags={tags}
                selectedTags={selectedTags}
                setSelectedTags={setSelectedTags}
            />

            <div className="flex flex-1 container mx-auto px-4 py-6 gap-6">
                <MyWorldsSidebar
                    myWorlds={myWorlds}
                    onSelectWorld={startCreation}
                />

                <main className="flex-1">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredWorlds.length > 0 ? (
                            filteredWorlds.map(world => (
                                <WorldCard
                                    key={world.id}
                                    world={world}
                                    onClick={() => startCreation(world.id)}
                                />
                            ))
                        ) : (
                            <div className="col-span-full text-center py-12 text-gray-500">
                                没有找到符合条件的世界
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
}